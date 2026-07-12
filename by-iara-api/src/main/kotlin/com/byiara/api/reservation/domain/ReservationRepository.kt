package com.byiara.api.reservation.domain

import java.time.OffsetDateTime
import java.util.UUID

interface ReservationRepository {
    fun findById(id: UUID): Reservation?

    fun findAll(query: ReservationListQuery, limit: Int, offset: Int): List<Reservation>

    fun countAll(query: ReservationListQuery): Int

    /** Active reservations (PENDING/CONFIRMED) that overlap the given half-open interval. */
    fun hasOverlap(startsAt: OffsetDateTime, endsAt: OffsetDateTime): Boolean

    /** Active reservation windows (PENDING/CONFIRMED) that overlap the given half-open interval. */
    fun findActiveWindowsOverlapping(startsAt: OffsetDateTime, endsAt: OffsetDateTime): List<ReservationWindow>

    fun create(reservation: NewReservation): Reservation

    fun updateDecision(
        id: UUID,
        status: ReservationStatus,
        rejectionReasonCode: RejectionReasonCode? = null,
        rejectionMessage: String? = null,
    ): Boolean

    fun findOrCreateCustomer(details: CustomerDetails): Customer
}

data class ReservationWindow(
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
)

enum class ReservationSort {
    STARTS_AT_ASC,
    STARTS_AT_DESC,
}

data class ReservationListQuery(
    val statuses: Set<ReservationStatus> = emptySet(),
    val startsFrom: OffsetDateTime? = null,
    val startsBefore: OffsetDateTime? = null,
    val historyBefore: OffsetDateTime? = null,
    val sort: ReservationSort = ReservationSort.STARTS_AT_DESC,
)
