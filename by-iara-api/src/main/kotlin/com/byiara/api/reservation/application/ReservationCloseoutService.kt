package com.byiara.api.reservation.application

import com.byiara.api.reservation.domain.IllegalReservationTransitionException
import com.byiara.api.reservation.domain.InvalidReservationRequestException
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationNotFoundException
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.ReservationStatus
import com.byiara.api.pack.domain.PackRepository
import com.byiara.api.discount.application.DiscountService
import com.byiara.api.discount.domain.CreateDiscountCommand
import com.byiara.api.discount.domain.CreatedDiscount
import com.byiara.api.discount.domain.DiscountAudience
import com.byiara.api.discount.domain.DiscountScope
import com.byiara.api.discount.domain.DiscountValueType
import com.byiara.api.notification.application.ReservationEmailService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID

data class CompletionDiscountCommand(
    val valueType: DiscountValueType,
    val valueAmount: Long,
    val validityDays: Long,
    val sameServiceOnly: Boolean,
)

@Service
class ReservationCloseoutService(
    private val reservationRepository: ReservationRepository,
    private val paymentService: ReservationPaymentService,
    private val packRepository: PackRepository,
    private val discountService: DiscountService,
    private val reservationEmailService: ReservationEmailService,
) {
    @Transactional
    fun complete(
        id: UUID,
        payment: RecordReservationPaymentCommand?,
        discount: CompletionDiscountCommand? = null,
    ): Reservation {
        val reservation = requireConfirmed(id, ReservationStatus.COMPLETED)
        if (reservation.endsAt.isAfter(OffsetDateTime.now())) {
            throw InvalidReservationRequestException("A reservation cannot be completed before its end time")
        }
        transition(id, ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED)
        packRepository.consumeReservation(id)
        discountService.consume(id)
        if (payment != null) {
            paymentService.record(id, payment)
        }
        val completed = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        val createdDiscount = discount?.let { createCompletionDiscount(completed, it) }
        reservationEmailService.notifyCustomerOfCompletion(completed, createdDiscount)
        return completed
    }

    private fun createCompletionDiscount(
        reservation: Reservation,
        discount: CompletionDiscountCommand,
    ): CreatedDiscount {
        val now = OffsetDateTime.now()
        val serviceIds = if (discount.sameServiceOnly) {
            setOf(
                reservation.serviceId
                    ?: throw InvalidReservationRequestException("This reservation is not linked to an active service"),
            )
        } else emptySet()
        return discountService.create(
            CreateDiscountCommand(
                name = "Thank you — ${reservation.customer.name}",
                audience = DiscountAudience.PERSONAL,
                scope = if (discount.sameServiceOnly) DiscountScope.SELECTED_SERVICES else DiscountScope.ALL_SERVICES,
                valueType = discount.valueType,
                valueAmount = discount.valueAmount,
                currency = reservation.price.currency.takeIf { discount.valueType == DiscountValueType.FIXED_AMOUNT },
                startsAt = now,
                endsAt = now.plusDays(discount.validityDays),
                maxUniqueClients = null,
                maxUsesPerCustomer = 1,
                serviceIds = serviceIds,
                customerEmail = reservation.customer.email,
                requestedCode = null,
            ),
        )
    }

    @Transactional
    fun markNoShow(id: UUID): Reservation {
        val reservation = requireConfirmed(id, ReservationStatus.NO_SHOW)
        if (reservation.startsAt.isAfter(OffsetDateTime.now())) {
            throw InvalidReservationRequestException("A reservation cannot be marked as no-show before its start time")
        }
        transition(id, ReservationStatus.CONFIRMED, ReservationStatus.NO_SHOW)
        packRepository.forfeitReservation(id)
        discountService.consume(id)
        return reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
    }

    private fun requireConfirmed(id: UUID, target: ReservationStatus): Reservation {
        val reservation = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        if (!reservation.status.canTransitionTo(target)) {
            throw IllegalReservationTransitionException(reservation.status, target)
        }
        return reservation
    }

    private fun transition(id: UUID, from: ReservationStatus, to: ReservationStatus) {
        if (!reservationRepository.transitionStatus(id, from, to)) {
            val current = reservationRepository.findById(id)?.status ?: throw ReservationNotFoundException(id)
            throw IllegalReservationTransitionException(current, to)
        }
    }
}
