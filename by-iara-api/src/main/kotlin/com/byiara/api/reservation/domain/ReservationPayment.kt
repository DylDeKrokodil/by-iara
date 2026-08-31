package com.byiara.api.reservation.domain

import java.time.OffsetDateTime
import java.util.UUID

enum class PaymentMethod {
    CASH,
    CARD,
    BANK_TRANSFER,
    OTHER,
}

enum class PaymentStatus {
    PAID,
    REFUNDED,
    VOIDED,
}

enum class PaymentState {
    UNPAID,
    PARTIALLY_PAID,
    PAID,
}

data class ReservationPayment(
    val id: UUID,
    val reservationId: UUID,
    val amountCents: Long,
    val currency: String,
    val method: PaymentMethod,
    val status: PaymentStatus,
    val paidAt: OffsetDateTime,
    val reference: String?,
)

data class NewReservationPayment(
    val reservationId: UUID,
    val amountCents: Long,
    val currency: String,
    val method: PaymentMethod,
    val paidAt: OffsetDateTime,
    val reference: String?,
)

data class PaymentSummary(
    val totalPaidCents: Long,
    val balanceDueCents: Long,
    val currency: String,
    val state: PaymentState,
)

interface ReservationPaymentRepository {
    fun create(payment: NewReservationPayment): ReservationPayment

    fun findByReservationId(reservationId: UUID): List<ReservationPayment>

    fun totalPaidCents(reservationId: UUID): Long
}

enum class AttentionReason {
    APPROVAL_REQUIRED,
    OUTCOME_REQUIRED,
    PAYMENT_DUE,
}

data class ReservationAttention(
    val reservation: Reservation,
    val reason: AttentionReason,
    val paymentSummary: PaymentSummary,
)
