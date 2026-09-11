package com.byiara.api.notification.application

import com.byiara.api.notification.domain.ClaimedReservationReminder
import com.byiara.api.notification.domain.ReservationReminderRepository
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.ReservationStatus
import com.byiara.api.settings.application.OperationalSettingsService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class ReservationReminderService(
    private val reminderRepository: ReservationReminderRepository,
    private val reservationRepository: ReservationRepository,
    private val settingsService: OperationalSettingsService,
    private val reservationEmailService: ReservationEmailService,
) {
    fun schedule(reservation: Reservation) {
        require(reservation.status == ReservationStatus.CONFIRMED) {
            "Only confirmed reservations can have reminders"
        }
        reminderRepository.schedule(reservation.id, reservation.startsAt)
    }

    fun dispatchDue(now: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC)): Int {
        if (!settingsService.bookingReminderEnabled()) return 0

        val claimed = reminderRepository.claimDue(
            now = now,
            hoursBefore = settingsService.bookingReminderHoursBefore(),
            limit = BATCH_SIZE,
            staleClaimBefore = now.minusMinutes(CLAIM_TIMEOUT_MINUTES),
        )
        claimed.forEach { dispatch(it, now) }
        return claimed.size
    }

    private fun dispatch(reminder: ClaimedReservationReminder, now: OffsetDateTime) {
        val reservation = reservationRepository.findById(reminder.reservationId)
        if (reservation == null ||
            reservation.status != ReservationStatus.CONFIRMED ||
            !reservation.startsAt.isEqual(reminder.reservationStartsAt) ||
            !reservation.startsAt.isAfter(now)
        ) {
            reminderRepository.markSkipped(reminder, "Reservation is no longer eligible")
            return
        }

        if (reservationEmailService.notifyCustomerOfReminder(reservation)) {
            reminderRepository.markSent(reminder, OffsetDateTime.now(ZoneOffset.UTC))
            return
        }

        val error = "Appointment reminder email could not be delivered"
        if (reminder.attemptNumber >= MAX_DELIVERY_ATTEMPTS) {
            reminderRepository.markFailed(reminder, error)
            log.error(
                "Giving up reminder delivery for reservation {} after {} worker attempts",
                reminder.reservationId,
                reminder.attemptNumber,
            )
        } else {
            val retryMinutes = RETRY_BASE_MINUTES * (1L shl (reminder.attemptNumber - 1))
            reminderRepository.markForRetry(reminder, now.plusMinutes(retryMinutes), error)
        }
    }

    companion object {
        private val log = LoggerFactory.getLogger(ReservationReminderService::class.java)
        private const val BATCH_SIZE = 50
        private const val CLAIM_TIMEOUT_MINUTES = 10L
        private const val MAX_DELIVERY_ATTEMPTS = 3
        private const val RETRY_BASE_MINUTES = 5L
    }
}
