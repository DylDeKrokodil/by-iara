package com.byiara.api.reservation.api

import com.byiara.api.reservation.application.ReservationPage
import com.byiara.api.reservation.domain.CreateReservationCommand
import com.byiara.api.reservation.domain.CustomerDetails
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.RejectionReasonCode
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
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
)

data class RejectReservationRequest(
    @field:NotNull
    val reasonCode: RejectionReasonCode?,

    @field:NotBlank
    @field:Size(max = 1000)
    val message: String?,
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
    )

fun ReservationPage.toResponse(): ReservationPageResponse =
    ReservationPageResponse(
        items = items.map { it.toResponse() },
        page = page,
        size = size,
        total = total,
    )
