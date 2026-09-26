package com.byiara.api.reservation.domain

import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

/** A customer-facing booking request, before catalog/availability validation. */
data class CreateReservationCommand(
    val serviceId: UUID,
    val serviceVariantId: UUID,
    val startsAt: OffsetDateTime,
    val customer: CustomerDetails,
    val notes: String?,
    val locale: ReservationLocale,
    val packOfferId: UUID? = null,
    val customerPackId: UUID? = null,
    val customerSessionToken: String? = null,
    val discountCode: String? = null,
    val expectedPriceCents: Long? = null,
)

data class PreviewDiscountCommand(
    val serviceId: UUID,
    val serviceVariantId: UUID,
    val customerEmail: String?,
    val discountCode: String,
)

data class CreateAdminReservationCommand(
    val serviceId: UUID,
    val serviceVariantId: UUID,
    val startsAt: OffsetDateTime,
    val customer: AdminCustomerDetails = AdminCustomerDetails(),
    val notes: String?,
    val locale: ReservationLocale,
    val priceCents: Long? = null,
    val tipCents: Long = 0,
)

/** Optional contact details for an appointment created retrospectively by an administrator. */
data class AdminCustomerDetails(
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
)

data class UpdateAdminReservationCommand(
    val serviceId: UUID,
    val serviceVariantId: UUID,
    val priceCents: Long,
    val tipCents: Long = 0,
)

class ReservationPriceChangedException : RuntimeException("Booking price changed. Review the updated price before submitting.")

/** A customer-facing slot lookup for a selected catalog option. */
data class FindBookableSlotsCommand(
    val serviceId: UUID,
    val serviceVariantId: UUID,
    val startDate: LocalDate,
    val endDate: LocalDate,
)
