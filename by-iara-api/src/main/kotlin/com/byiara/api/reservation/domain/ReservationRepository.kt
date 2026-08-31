package com.byiara.api.reservation.domain

import java.time.OffsetDateTime
import java.util.UUID

interface ReservationRepository {
    fun findById(id: UUID): Reservation?

    /** Locks the reservation row for the current transaction before returning it. */
    fun findByIdForUpdate(id: UUID): Reservation?

    fun findAll(query: ReservationListQuery, limit: Int, offset: Int): List<Reservation>

    fun countAll(query: ReservationListQuery): Int

    /**
     * Active reservations (PENDING/CONFIRMED) that overlap the given half-open interval.
     * Callers may expand the interval to enforce spacing around a requested appointment.
     */
    fun hasOverlap(startsAt: OffsetDateTime, endsAt: OffsetDateTime, excludingReservationId: UUID? = null): Boolean

    /**
     * Active reservation windows (PENDING/CONFIRMED) that overlap the given half-open interval.
     * Callers may expand the interval to include appointment buffers.
     */
    fun findActiveWindowsOverlapping(
        startsAt: OffsetDateTime,
        endsAt: OffsetDateTime,
        excludingReservationId: UUID? = null,
    ): List<ReservationWindow>

    fun create(reservation: NewReservation): Reservation

    fun updateDecision(
        id: UUID,
        status: ReservationStatus,
        rejectionReasonCode: RejectionReasonCode? = null,
        rejectionMessage: String? = null,
    ): Boolean

    fun updateCancellation(
        id: UUID,
        cancellationReasonCode: CancellationReasonCode,
        cancellationMessage: String,
    ): Boolean

    fun reschedule(
        id: UUID,
        previousStartsAt: OffsetDateTime,
        previousEndsAt: OffsetDateTime,
        newStartsAt: OffsetDateTime,
        newEndsAt: OffsetDateTime,
    ): Boolean

    fun transitionStatus(id: UUID, from: ReservationStatus, to: ReservationStatus): Boolean

    fun findAttention(now: OffsetDateTime, limit: Int, offset: Int): List<ReservationAttention>

    fun countAttention(now: OffsetDateTime): Int

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
