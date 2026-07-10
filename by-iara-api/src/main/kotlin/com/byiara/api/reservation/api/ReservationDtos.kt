package com.byiara.api.reservation.api

import com.byiara.api.reservation.application.ReservationPage
import com.byiara.api.reservation.domain.CreateReservationCommand
import com.byiara.api.reservation.domain.CustomerDetails
import com.byiara.api.reservation.domain.Reservation
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
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
) {
    fun toCommand(): CreateReservationCommand =
        CreateReservationCommand(
            serviceId = serviceId!!,
            serviceVariantId = serviceVariantId!!,
            startsAt = startsAt!!,
            customer = customer!!.toDetails(),
            notes = notes?.trim()?.ifBlank { null },
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
    )

fun ReservationPage.toResponse(): ReservationPageResponse =
    ReservationPageResponse(
        items = items.map { it.toResponse() },
        page = page,
        size = size,
        total = total,
    )
