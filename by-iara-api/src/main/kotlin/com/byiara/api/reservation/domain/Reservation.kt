package com.byiara.api.reservation.domain

import com.byiara.api.catalog.domain.Money
import java.time.OffsetDateTime
import java.util.UUID

data class Reservation(
    val id: UUID,
    val customer: Customer,
    val serviceId: UUID?,
    val serviceVariantId: UUID?,
    val serviceName: String,
    val durationMinutes: Int,
    val price: Money,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val status: ReservationStatus,
    val notes: String?,
    val locale: ReservationLocale,
)

/** Everything needed to persist a new reservation, with the catalog snapshot already resolved. */
data class NewReservation(
    val customerId: UUID,
    val serviceId: UUID,
    val serviceVariantId: UUID,
    val serviceName: String,
    val durationMinutes: Int,
    val price: Money,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val notes: String?,
    val locale: ReservationLocale,
)
