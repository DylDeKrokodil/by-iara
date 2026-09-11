package com.byiara.api.notification.domain

import java.time.OffsetDateTime
import java.util.UUID

data class ClaimedReservationReminder(
    val reservationId: UUID,
    val reservationStartsAt: OffsetDateTime,
    val attemptNumber: Int,
)

interface ReservationReminderRepository {
    /** Creates a reminder, or resets the existing delivery when a confirmed booking is rescheduled. */
    fun schedule(reservationId: UUID, reservationStartsAt: OffsetDateTime)

    /** Atomically leases due reminders so several API instances can run the worker safely. */
    fun claimDue(
        now: OffsetDateTime,
        hoursBefore: Int,
        limit: Int,
        staleClaimBefore: OffsetDateTime,
    ): List<ClaimedReservationReminder>

    fun markSent(reminder: ClaimedReservationReminder, sentAt: OffsetDateTime)

    fun markForRetry(
        reminder: ClaimedReservationReminder,
        retryAt: OffsetDateTime,
        error: String,
    )

    fun markFailed(reminder: ClaimedReservationReminder, error: String)

    fun markSkipped(reminder: ClaimedReservationReminder, reason: String)
}
