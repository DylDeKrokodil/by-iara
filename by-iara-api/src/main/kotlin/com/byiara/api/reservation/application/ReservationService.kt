package com.byiara.api.reservation.application

import com.byiara.api.availability.application.AvailabilityService
import com.byiara.api.catalog.domain.Service as CatalogService
import com.byiara.api.catalog.domain.ServiceRepository
import com.byiara.api.reservation.domain.CreateReservationCommand
import com.byiara.api.reservation.domain.FindBookableSlotsCommand
import com.byiara.api.reservation.domain.InvalidReservationRequestException
import com.byiara.api.reservation.domain.IllegalReservationTransitionException
import com.byiara.api.reservation.domain.NewReservation
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationListQuery
import com.byiara.api.reservation.domain.ReservationNotFoundException
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.ReservationSort
import com.byiara.api.reservation.domain.ReservationStatus
import com.byiara.api.reservation.domain.SlotAlreadyBookedException
import com.byiara.api.reservation.domain.SlotNotAvailableException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID

@Service
class ReservationService(
    private val reservationRepository: ReservationRepository,
    private val serviceRepository: ServiceRepository,
    private val availabilityService: AvailabilityService,
) {
    @Transactional
    fun create(command: CreateReservationCommand): Reservation {
        val service = requireActiveService(command.serviceId)
        val variant = requireActiveVariant(service, command.serviceVariantId)

        val endsAt = command.startsAt.plusMinutes(variant.durationMinutes.toLong())

        if (!availabilityService.isAvailable(command.startsAt, variant.durationMinutes)) {
            throw SlotNotAvailableException()
        }
        if (reservationRepository.hasOverlap(command.startsAt, endsAt)) {
            throw SlotAlreadyBookedException()
        }

        val customer = reservationRepository.findOrCreateCustomer(command.customer)

        return reservationRepository.create(
            NewReservation(
                customerId = customer.id,
                serviceId = service.id,
                serviceVariantId = variant.id,
                serviceName = service.name,
                durationMinutes = variant.durationMinutes,
                price = variant.price,
                startsAt = command.startsAt,
                endsAt = endsAt,
                notes = command.notes,
            ),
        )
    }

    @Transactional(readOnly = true)
    fun findBookableSlots(command: FindBookableSlotsCommand): List<OffsetDateTime> {
        val service = requireActiveService(command.serviceId)
        val variant = requireActiveVariant(service, command.serviceVariantId)
        val durationMinutes = variant.durationMinutes
        val slots = availabilityService.findAvailableSlots(
            command.startDate,
            command.endDate,
            durationMinutes,
        )

        if (slots.isEmpty()) {
            return emptyList()
        }

        val queryStart = slots.first()
        val queryEnd = slots.last().plusMinutes(durationMinutes.toLong())
        val activeWindows = reservationRepository.findActiveWindowsOverlapping(queryStart, queryEnd)

        return slots.filter { slotStart ->
            val slotEnd = slotStart.plusMinutes(durationMinutes.toLong())
            activeWindows.none { window ->
                slotStart.isBefore(window.endsAt) && slotEnd.isAfter(window.startsAt)
            }
        }
    }

    @Transactional(readOnly = true)
    fun list(
        statuses: Set<ReservationStatus>,
        startsFrom: OffsetDateTime?,
        startsBefore: OffsetDateTime?,
        historyBefore: OffsetDateTime?,
        sort: ReservationSort,
        page: Int,
        size: Int,
    ): ReservationPage {
        val safeSize = size.coerceIn(1, MAX_PAGE_SIZE)
        val safePage = page.coerceAtLeast(0)
        val query = ReservationListQuery(
            statuses = statuses,
            startsFrom = startsFrom,
            startsBefore = startsBefore,
            historyBefore = historyBefore,
            sort = sort,
        )
        val total = reservationRepository.countAll(query)
        val items = reservationRepository.findAll(query, limit = safeSize, offset = safePage * safeSize)
        return ReservationPage(items = items, page = safePage, size = safeSize, total = total)
    }

    @Transactional(readOnly = true)
    fun get(id: UUID): Reservation =
        reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)

    @Transactional
    fun confirm(id: UUID): Reservation = transition(id, ReservationStatus.CONFIRMED)

    @Transactional
    fun reject(id: UUID): Reservation = transition(id, ReservationStatus.REJECTED)

    private fun transition(id: UUID, target: ReservationStatus): Reservation {
        val reservation = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        if (!reservation.status.canTransitionTo(target)) {
            throw IllegalReservationTransitionException(reservation.status, target)
        }
        reservationRepository.updateStatus(id, target)
        return reservation.copy(status = target)
    }

    private fun requireActiveService(serviceId: UUID) =
        serviceRepository.findById(serviceId)
            ?.takeIf { it.active }
            ?: throw InvalidReservationRequestException("Service is not available for booking")

    private fun requireActiveVariant(service: CatalogService, variantId: UUID) =
        service.variants.firstOrNull { it.id == variantId && it.active }
            ?: throw InvalidReservationRequestException("Selected option is not available for booking")

    companion object {
        private const val MAX_PAGE_SIZE = 100
    }
}

data class ReservationPage(
    val items: List<Reservation>,
    val page: Int,
    val size: Int,
    val total: Int,
)
