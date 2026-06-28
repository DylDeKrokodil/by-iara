package com.byiara.api.reservation.domain

import java.time.OffsetDateTime
import java.util.UUID

interface ReservationRepository {
    fun findById(id: UUID): Reservation?

    fun findAll(status: ReservationStatus?, limit: Int, offset: Int): List<Reservation>

    fun countAll(status: ReservationStatus?): Int

    /** Active reservations (PENDING/CONFIRMED) that overlap the given half-open interval. */
    fun hasOverlap(startsAt: OffsetDateTime, endsAt: OffsetDateTime): Boolean

    fun create(reservation: NewReservation): Reservation

    fun updateStatus(id: UUID, status: ReservationStatus): Boolean

    fun findOrCreateCustomer(details: CustomerDetails): Customer
}
