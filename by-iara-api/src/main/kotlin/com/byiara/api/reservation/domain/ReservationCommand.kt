package com.byiara.api.reservation.domain

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
