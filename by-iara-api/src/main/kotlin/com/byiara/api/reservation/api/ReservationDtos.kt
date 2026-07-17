package com.byiara.api.reservation.api

import com.byiara.api.reservation.application.ReservationPage
import com.byiara.api.reservation.application.RecordReservationPaymentCommand
import com.byiara.api.reservation.application.ReservationAttentionPage
import com.byiara.api.reservation.application.ReservationPayments
import com.byiara.api.reservation.domain.CreateReservationCommand
import com.byiara.api.reservation.domain.CancellationReasonCode
import com.byiara.api.reservation.domain.CustomerDetails
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.RejectionReasonCode
import com.byiara.api.reservation.domain.PaymentMethod
import com.byiara.api.reservation.domain.PaymentSummary
import com.byiara.api.reservation.domain.ReservationAttention
import com.byiara.api.reservation.domain.ReservationPayment
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime
import java.util.UUID

data class CreateReservationRequest(
    @field:NotNull
    val serviceId: UUID?,

    @field:NotNull
    val serviceVariantId: UUID?,

    @field:NotNull
    val startsAt: OffsetDateTime?,

    @field:NotNull
    @field:Valid
    val customer: CustomerRequest?,

    @field:Size(max = 1000)
    val notes: String? = null,

    // Which language (site was browsed in) the confirmation/rejection email should be sent in.
    // Optional and defaults to English so older clients that don't send it still work.
    @field:Pattern(regexp = "pt|en", message = "must be 'pt' or 'en'")
    val locale: String? = null,
) {
    fun toCommand(): CreateReservationCommand =
        CreateReservationCommand(
            serviceId = serviceId!!,
            serviceVariantId = serviceVariantId!!,
            startsAt = startsAt!!,
            customer = customer!!.toDetails(),
            notes = notes?.trim()?.ifBlank { null },
            locale = locale?.let { ReservationLocale.fromCode(it) } ?: ReservationLocale.EN,
        )
}

data class CustomerRequest(
    @field:NotBlank
    @field:Size(max = 160)
    val name: String,

    @field:NotBlank
    @field:Email
    @field:Size(max = 255)
    val email: String,

    @field:Size(max = 40)
    val phone: String? = null,
) {
    fun toDetails(): CustomerDetails =
        CustomerDetails(name = name, email = email, phone = phone)
}

data class ReservationResponse(
    val id: UUID,
    val status: String,
    val serviceId: UUID?,
    val serviceVariantId: UUID?,
    val serviceName: String,
    val durationMinutes: Int,
    val price: ReservationMoneyResponse,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val customer: CustomerResponse,
    val notes: String?,
    val locale: String,
    val rejectionReasonCode: String?,
    val rejectionMessage: String?,
    val decidedAt: OffsetDateTime?,
    val cancellationReasonCode: String?,
    val cancellationMessage: String?,
)

data class RejectReservationRequest(
    @field:NotNull
    val reasonCode: RejectionReasonCode?,

    @field:NotBlank
    @field:Size(max = 1000)
    val message: String?,
)

data class CancelReservationRequest(
    @field:NotNull
    val reasonCode: CancellationReasonCode?,

    @field:NotBlank
    @field:Size(max = 1000)
    val message: String?,
)

data class CompleteReservationRequest(
    @field:Valid
    val payment: RecordPaymentRequest? = null,
)

data class RecordPaymentRequest(
    @field:NotNull
    @field:Positive
    val amountCents: Long?,

    @field:NotNull
    @field:NotBlank
    @field:Pattern(regexp = "[A-Za-z]{3}", message = "must be a three-letter currency code")
    val currency: String?,

    @field:NotNull
    val method: PaymentMethod?,

    val paidAt: OffsetDateTime? = null,

    @field:Size(max = 255)
    val reference: String? = null,
) {
    fun toCommand(): RecordReservationPaymentCommand = RecordReservationPaymentCommand(
        amountCents = amountCents!!,
        currency = currency!!,
        method = method!!,
        paidAt = paidAt,
        reference = reference,
    )
}

data class PaymentSummaryResponse(
    val totalPaidCents: Long,
    val balanceDueCents: Long,
    val currency: String,
    val state: String,
)

data class ReservationPaymentResponse(
    val id: UUID,
    val reservationId: UUID,
    val amountCents: Long,
    val currency: String,
    val method: String,
    val status: String,
    val paidAt: OffsetDateTime,
    val reference: String?,
)

data class ReservationPaymentsResponse(
    val items: List<ReservationPaymentResponse>,
    val summary: PaymentSummaryResponse,
)

data class ReservationAttentionResponse(
    val reservation: ReservationResponse,
    val reason: String,
    val paymentSummary: PaymentSummaryResponse,
)

data class ReservationAttentionPageResponse(
    val items: List<ReservationAttentionResponse>,
    val page: Int,
    val size: Int,
    val total: Int,
)

data class ReservationMoneyResponse(
    val amountCents: Long,
    val currency: String,
)

data class CustomerResponse(
    val name: String,
    val email: String,
    val phone: String?,
)

data class NextAvailableSlotResponse(
    val startsAt: OffsetDateTime?,
)

data class ReservationPageResponse(
    val items: List<ReservationResponse>,
    val page: Int,
    val size: Int,
    val total: Int,
)

fun Reservation.toResponse(): ReservationResponse =
    ReservationResponse(
        id = id,
        status = status.name,
        serviceId = serviceId,
        serviceVariantId = serviceVariantId,
        serviceName = serviceName,
        durationMinutes = durationMinutes,
        price = ReservationMoneyResponse(price.amountCents, price.currency),
        startsAt = startsAt,
        endsAt = endsAt,
        customer = CustomerResponse(customer.name, customer.email, customer.phone),
        notes = notes,
        locale = locale.name.lowercase(),
        rejectionReasonCode = rejectionReasonCode?.name,
        rejectionMessage = rejectionMessage,
        decidedAt = decidedAt,
        cancellationReasonCode = cancellationReasonCode?.name,
        cancellationMessage = cancellationMessage,
    )

fun ReservationPage.toResponse(): ReservationPageResponse =
    ReservationPageResponse(
        items = items.map { it.toResponse() },
        page = page,
        size = size,
        total = total,
    )

fun PaymentSummary.toResponse(): PaymentSummaryResponse = PaymentSummaryResponse(
    totalPaidCents = totalPaidCents,
    balanceDueCents = balanceDueCents,
    currency = currency,
    state = state.name,
)

fun ReservationPayment.toResponse(): ReservationPaymentResponse = ReservationPaymentResponse(
    id = id,
    reservationId = reservationId,
    amountCents = amountCents,
    currency = currency,
    method = method.name,
    status = status.name,
    paidAt = paidAt,
    reference = reference,
)

fun ReservationPayments.toResponse(): ReservationPaymentsResponse = ReservationPaymentsResponse(
    items = items.map { it.toResponse() },
    summary = summary.toResponse(),
)

fun ReservationAttention.toResponse(): ReservationAttentionResponse = ReservationAttentionResponse(
    reservation = reservation.toResponse(),
    reason = reason.name,
    paymentSummary = paymentSummary.toResponse(),
)

fun ReservationAttentionPage.toResponse(): ReservationAttentionPageResponse = ReservationAttentionPageResponse(
    items = items.map { it.toResponse() },
    page = page,
    size = size,
    total = total,
)
