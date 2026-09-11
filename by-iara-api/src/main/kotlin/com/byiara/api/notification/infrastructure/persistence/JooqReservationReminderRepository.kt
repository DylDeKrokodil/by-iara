package com.byiara.api.notification.infrastructure.persistence

import com.byiara.api.notification.domain.ClaimedReservationReminder
import com.byiara.api.notification.domain.ReservationReminderRepository
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqReservationReminderRepository(
    private val dsl: DSLContext,
) : ReservationReminderRepository {
    private val reminders = table(name("reservation_reminders"))
    private val reminderReservationId = field(name("reservation_reminders", "reservation_id"), UUID::class.java)
    private val reminderStartsAt = field(name("reservation_reminders", "reservation_starts_at"), OffsetDateTime::class.java)
    private val reminderStatus = field(name("reservation_reminders", "status"), String::class.java)
    private val attemptCount = field(name("reservation_reminders", "attempt_count"), Int::class.java)
    private val nextAttemptAt = field(name("reservation_reminders", "next_attempt_at"), OffsetDateTime::class.java)
    private val claimedAt = field(name("reservation_reminders", "claimed_at"), OffsetDateTime::class.java)
    private val sentAt = field(name("reservation_reminders", "sent_at"), OffsetDateTime::class.java)
    private val lastError = field(name("reservation_reminders", "last_error"), String::class.java)
    private val updatedAt = field(name("reservation_reminders", "updated_at"), OffsetDateTime::class.java)

    private val reservations = table(name("reservations"))
    private val reservationId = field(name("reservations", "id"), UUID::class.java)
    private val reservationStartsAt = field(name("reservations", "starts_at"), OffsetDateTime::class.java)
    private val reservationStatus = field(name("reservations", "status"), String::class.java)

    override fun schedule(reservationId: UUID, reservationStartsAt: OffsetDateTime) {
        val now = OffsetDateTime.now()
        dsl.insertInto(reminders)
            .columns(
                reminderReservationId,
                reminderStartsAt,
                reminderStatus,
                attemptCount,
                nextAttemptAt,
                claimedAt,
                sentAt,
                lastError,
                updatedAt,
            )
            .values(reservationId, reservationStartsAt, PENDING, 0, now, null, null, null, now)
            .onConflict(reminderReservationId)
            .doUpdate()
            .set(reminderStartsAt, reservationStartsAt)
            .set(reminderStatus, PENDING)
            .set(attemptCount, 0)
            .set(nextAttemptAt, now)
            .set(claimedAt, null as OffsetDateTime?)
            .set(sentAt, null as OffsetDateTime?)
            .set(lastError, null as String?)
            .set(updatedAt, now)
            .execute()
    }

    @Transactional
    override fun claimDue(
        now: OffsetDateTime,
        hoursBefore: Int,
        limit: Int,
        staleClaimBefore: OffsetDateTime,
    ): List<ClaimedReservationReminder> {
        val claimableStatus = reminderStatus.eq(PENDING)
            .and(nextAttemptAt.lessOrEqual(now))
            .or(reminderStatus.eq(PROCESSING).and(claimedAt.lessOrEqual(staleClaimBefore)))

        val due = dsl.select(reminderReservationId, reminderStartsAt, attemptCount)
            .from(reminders)
            .join(reservations).on(reservationId.eq(reminderReservationId))
            .where(claimableStatus)
            .and(reservationStatus.eq("CONFIRMED"))
            .and(reservationStartsAt.eq(reminderStartsAt))
            .and(reminderStartsAt.greaterThan(now))
            .and(reminderStartsAt.lessOrEqual(now.plusHours(hoursBefore.toLong())))
            .orderBy(reminderStartsAt.asc())
            .limit(limit)
            .forUpdate()
            .skipLocked()
            .fetch()

        return due.map { record ->
            val nextAttemptNumber = record.get(attemptCount) + 1
            dsl.update(reminders)
                .set(reminderStatus, PROCESSING)
                .set(attemptCount, nextAttemptNumber)
                .set(claimedAt, now)
                .set(updatedAt, now)
                .where(reminderReservationId.eq(record.get(reminderReservationId)))
                .and(reminderStartsAt.eq(record.get(reminderStartsAt)))
                .execute()
            ClaimedReservationReminder(
                reservationId = record.get(reminderReservationId),
                reservationStartsAt = record.get(reminderStartsAt),
                attemptNumber = nextAttemptNumber,
            )
        }
    }

    override fun markSent(reminder: ClaimedReservationReminder, sentAt: OffsetDateTime) {
        updateClaim(reminder, SENT, sentAt, sentAt, null)
    }

    override fun markForRetry(
        reminder: ClaimedReservationReminder,
        retryAt: OffsetDateTime,
        error: String,
    ) {
        updateClaim(reminder, PENDING, retryAt, null, error)
    }

    override fun markFailed(reminder: ClaimedReservationReminder, error: String) {
        updateClaim(reminder, FAILED, OffsetDateTime.now(), null, error)
    }

    override fun markSkipped(reminder: ClaimedReservationReminder, reason: String) {
        updateClaim(reminder, SKIPPED, OffsetDateTime.now(), null, reason)
    }

    private fun updateClaim(
        reminder: ClaimedReservationReminder,
        status: String,
        nextAttempt: OffsetDateTime,
        sent: OffsetDateTime?,
        error: String?,
    ) {
        dsl.update(reminders)
            .set(reminderStatus, status)
            .set(nextAttemptAt, nextAttempt)
            .set(claimedAt, null as OffsetDateTime?)
            .set(sentAt, sent)
            .set(lastError, error?.take(MAX_ERROR_LENGTH))
            .set(updatedAt, OffsetDateTime.now())
            .where(reminderReservationId.eq(reminder.reservationId))
            .and(reminderStartsAt.eq(reminder.reservationStartsAt))
            .and(reminderStatus.eq(PROCESSING))
            .execute()
    }

    companion object {
        private const val PENDING = "PENDING"
        private const val PROCESSING = "PROCESSING"
        private const val SENT = "SENT"
        private const val FAILED = "FAILED"
        private const val SKIPPED = "SKIPPED"
        private const val MAX_ERROR_LENGTH = 2_000
    }
}
