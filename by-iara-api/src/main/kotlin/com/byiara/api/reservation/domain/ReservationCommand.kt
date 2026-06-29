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
)

/** A customer-facing slot lookup for a selected catalog option. */
data class FindBookableSlotsCommand(
    val serviceId: UUID,
    val serviceVariantId: UUID,
    val startDate: LocalDate,
    val endDate: LocalDate,
)
