package com.byiara.api.reservation.application

import com.byiara.api.availability.application.AvailabilityService
import com.byiara.api.catalog.domain.Service as CatalogService
import com.byiara.api.catalog.domain.ServiceRepository
import com.byiara.api.notification.application.ReservationEmailService
import com.byiara.api.pack.application.CustomerAccessService
import com.byiara.api.pack.domain.NewCustomerPack
import com.byiara.api.pack.domain.PackNotAvailableException
import com.byiara.api.pack.domain.PackRepository
import com.byiara.api.catalog.domain.Money
import com.byiara.api.reservation.domain.CreateReservationCommand
import com.byiara.api.reservation.domain.CancellationReasonCode
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
import com.byiara.api.reservation.domain.RejectionReasonCode
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
    private val reservationEmailService: ReservationEmailService,
    private val packRepository: PackRepository,
    private val customerAccessService: CustomerAccessService,
) {
    @Transactional
    fun create(command: CreateReservationCommand): Reservation {
        val service = requireActiveService(command.serviceId)
        val variant = requireActiveVariant(service, command.serviceVariantId)

        if (command.packOfferId != null && command.customerPackId != null) {
            throw InvalidReservationRequestException("Choose either a new pack or an existing pack")
        }

        val endsAt = command.startsAt.plusMinutes(variant.durationMinutes.toLong())

        if (!availabilityService.isAvailable(command.startsAt, variant.durationMinutes)) {
            throw SlotNotAvailableException()
        }
        if (reservationRepository.hasOverlap(command.startsAt, endsAt)) {
            throw SlotAlreadyBookedException()
        }

        val existingPack = command.customerPackId?.let { packId ->
            val token = command.customerSessionToken
                ?: throw InvalidReservationRequestException("Customer verification is required to use a pack")
            val verifiedCustomer = customerAccessService.authenticate(token)
            packRepository.findUsableForUpdate(packId, verifiedCustomer.id, service.id, variant.durationMinutes)
                ?: throw PackNotAvailableException("This pack is not available for the selected appointment")
        }
        val customer = if (existingPack != null) {
            customerAccessService.authenticate(command.customerSessionToken!!)
        } else {
            reservationRepository.findOrCreateCustomer(command.customer)
        }
        val newPackOffer = command.packOfferId?.let { offerId ->
            service.packOffers.firstOrNull {
                it.id == offerId && it.active && it.durationMinutes == variant.durationMinutes
            } ?: throw PackNotAvailableException("This pack offer is no longer available")
        }

        val reservationPrice = when {
            existingPack != null -> Money(0, existingPack.price.currency)
            newPackOffer != null -> newPackOffer.price
            else -> variant.price
        }

        val reservation = reservationRepository.create(
            NewReservation(
                customerId = customer.id,
                serviceId = service.id,
                serviceVariantId = variant.id,
                serviceName = service.name,
                durationMinutes = variant.durationMinutes,
                price = reservationPrice,
                startsAt = command.startsAt,
                endsAt = endsAt,
                notes = command.notes,
                locale = command.locale,
            ),
        )
        if (newPackOffer != null) {
            packRepository.createPending(
                NewCustomerPack(
                    customerId = customer.id,
                    packOfferId = newPackOffer.id,
                    originatingReservationId = reservation.id,
                    serviceId = service.id,
                    serviceName = service.name,
                    durationMinutes = variant.durationMinutes,
                    totalSessions = newPackOffer.sessionCount,
                    price = newPackOffer.price,
                    validityDays = newPackOffer.validityDays,
                ),
            )
        } else if (existingPack != null) {
            packRepository.addRedemption(existingPack.id, reservation.id)
        }
        reservationEmailService.notifyAdminsOfNewReservation(reservation)
        return reservation
    }

    @Transactional(readOnly = true)
    fun findBookableSlots(command: FindBookableSlotsCommand): List<OffsetDateTime> {
        val service = requireActiveService(command.serviceId)
        val variant = requireActiveVariant(service, command.serviceVariantId)
        val slots = availabilityService.findAvailableSlots(
            command.startDate,
            command.endDate,
            variant.durationMinutes,
        )
        return excludeOverlappingReservations(slots, variant.durationMinutes)
    }

    /**
     * Earliest bookable slot from today onward (falling back to the next open day
     * when today has nothing left), for the shortest active catalog offering (the
     * option most likely to still fit). A marketing signal, not tied to any one
     * service the visitor hasn't picked yet.
     */
    @Transactional(readOnly = true)
    fun findNextAvailableSlot(): OffsetDateTime? {
        val shortestDuration = serviceRepository.findCatalog()
            .flatMap { it.variants }
            .minOfOrNull { it.durationMinutes }
            ?: return null

        val today = availabilityService.today()
        val slots = availabilityService.findAvailableSlots(
            today,
            today.plusDays(NEXT_AVAILABLE_WINDOW_DAYS),
            shortestDuration,
        )
        return excludeOverlappingReservations(slots, shortestDuration).firstOrNull()
    }

    private fun excludeOverlappingReservations(
        slots: List<OffsetDateTime>,
        durationMinutes: Int,
    ): List<OffsetDateTime> {
        if (slots.isEmpty()) {
            return slots
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

    @Transactional(readOnly = true)
    fun listAttention(page: Int, size: Int): ReservationAttentionPage {
        val safeSize = size.coerceIn(1, MAX_PAGE_SIZE)
        val safePage = page.coerceAtLeast(0)
        val now = OffsetDateTime.now()
        return ReservationAttentionPage(
            items = reservationRepository.findAttention(now, safeSize, safePage * safeSize),
            page = safePage,
            size = safeSize,
            total = reservationRepository.countAttention(now),
        )
    }

    @Transactional
    fun confirm(id: UUID): Reservation = transition(id, ReservationStatus.CONFIRMED)

    @Transactional
    fun reject(id: UUID, reasonCode: RejectionReasonCode, message: String): Reservation =
        transition(id, ReservationStatus.REJECTED, reasonCode, message).also {
            packRepository.releaseReservation(id)
        }

    @Transactional
    fun cancel(id: UUID, reasonCode: CancellationReasonCode, message: String): Reservation {
        val reservation = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        if (!reservation.status.canTransitionTo(ReservationStatus.CANCELLED)) {
            throw IllegalReservationTransitionException(reservation.status, ReservationStatus.CANCELLED)
        }
        reservationRepository.updateCancellation(id, reasonCode, message)
        packRepository.releaseReservation(id)
        val updated = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        reservationEmailService.notifyCustomerOfDecision(updated)
        return updated
    }

    private fun transition(
        id: UUID,
        target: ReservationStatus,
        rejectionReasonCode: RejectionReasonCode? = null,
        rejectionMessage: String? = null,
    ): Reservation {
        val reservation = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        if (!reservation.status.canTransitionTo(target)) {
            throw IllegalReservationTransitionException(reservation.status, target)
        }
        reservationRepository.updateDecision(id, target, rejectionReasonCode, rejectionMessage)
        val updated = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        reservationEmailService.notifyCustomerOfDecision(updated)
        return updated
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
        private const val NEXT_AVAILABLE_WINDOW_DAYS = 30L
    }
}

data class ReservationPage(
    val items: List<Reservation>,
    val page: Int,
    val size: Int,
    val total: Int,
)

data class ReservationAttentionPage(
    val items: List<com.byiara.api.reservation.domain.ReservationAttention>,
    val page: Int,
    val size: Int,
    val total: Int,
)
