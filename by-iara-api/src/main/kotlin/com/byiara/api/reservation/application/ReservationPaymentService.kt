package com.byiara.api.reservation.application

import com.byiara.api.reservation.domain.InvalidReservationRequestException
import com.byiara.api.reservation.domain.NewReservationPayment
import com.byiara.api.reservation.domain.PaymentMethod
import com.byiara.api.reservation.domain.PaymentState
import com.byiara.api.reservation.domain.PaymentStatus
import com.byiara.api.reservation.domain.PaymentSummary
import com.byiara.api.reservation.domain.ReservationNotFoundException
import com.byiara.api.reservation.domain.ReservationPayment
import com.byiara.api.reservation.domain.ReservationPaymentRepository
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.ReservationStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID
import com.byiara.api.pack.application.CustomerAccessService
import com.byiara.api.pack.domain.PackRepository

data class RecordReservationPaymentCommand(
    val amountCents: Long,
    val tipCents: Long = 0,
    val currency: String,
    val method: PaymentMethod,
    val paidAt: OffsetDateTime?,
    val reference: String?,
)

data class ReservationPayments(
    val items: List<ReservationPayment>,
    val summary: PaymentSummary,
)

@Service
class ReservationPaymentService(
    private val reservationRepository: ReservationRepository,
    private val paymentRepository: ReservationPaymentRepository,
    private val packRepository: PackRepository,
    private val customerAccessService: CustomerAccessService,
) {
    @Transactional
    fun record(reservationId: UUID, command: RecordReservationPaymentCommand): ReservationPayment {
        val reservation = reservationRepository.findByIdForUpdate(reservationId)
            ?: throw ReservationNotFoundException(reservationId)
        if (reservation.status !in setOf(ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED)) {
            throw InvalidReservationRequestException("Payments can only be recorded for confirmed or completed reservations")
        }
        if (command.amountCents <= 0L) {
            throw InvalidReservationRequestException("Payment amount must be greater than zero")
        }
        if (command.tipCents < 0L) {
            throw InvalidReservationRequestException("Tip cannot be negative")
        }

        val currency = command.currency.trim().uppercase()
        if (currency != reservation.price.currency) {
            throw InvalidReservationRequestException("Payment currency must match the reservation currency")
        }

        val alreadyPaid = paymentRepository.totalPaidCents(reservationId)
        val updatedTipCents = reservation.tipCents + command.tipCents
        val updatedPriceCents = reservation.price.amountCents + command.tipCents
        if (alreadyPaid + command.amountCents > updatedPriceCents) {
            throw InvalidReservationRequestException("Payment amount exceeds the remaining reservation balance")
        }

        if (command.tipCents > 0L && !reservationRepository.updatePriceAndTip(
                reservationId,
                updatedPriceCents,
                updatedTipCents,
            )
        ) {
            throw InvalidReservationRequestException("The reservation changed while saving the tip")
        }

        val paidAt = command.paidAt ?: OffsetDateTime.now()
        if (paidAt.isAfter(OffsetDateTime.now().plusMinutes(5))) {
            throw InvalidReservationRequestException("Payment time cannot be in the future")
        }

        val payment = paymentRepository.create(
            NewReservationPayment(
                reservationId = reservationId,
                amountCents = command.amountCents,
                tipCents = command.tipCents,
                currency = currency,
                method = command.method,
                paidAt = paidAt,
                reference = command.reference?.trim()?.ifBlank { null },
            ),
        )
        if (alreadyPaid + command.amountCents == reservation.price.amountCents &&
            packRepository.activateForOriginatingReservation(reservationId, OffsetDateTime.now())
        ) {
            customerAccessService.sendLink(reservation.customer, reservation.locale.name.lowercase())
        }
        return payment
    }

    @Transactional(readOnly = true)
    fun getForReservation(reservationId: UUID): ReservationPayments {
        val reservation = reservationRepository.findById(reservationId) ?: throw ReservationNotFoundException(reservationId)
        val items = paymentRepository.findByReservationId(reservationId)
        val totalPaid = items.filter { it.status == PaymentStatus.PAID }.sumOf { it.amountCents }
        val balance = (reservation.price.amountCents - totalPaid).coerceAtLeast(0L)
        val state = when {
            totalPaid <= 0L -> PaymentState.UNPAID
            balance > 0L -> PaymentState.PARTIALLY_PAID
            else -> PaymentState.PAID
        }
        return ReservationPayments(
            items = items,
            summary = PaymentSummary(totalPaid, balance, reservation.price.currency, state),
        )
    }
}
