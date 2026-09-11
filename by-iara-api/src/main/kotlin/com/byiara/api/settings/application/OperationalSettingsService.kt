package com.byiara.api.settings.application

import com.byiara.api.settings.domain.OperationalSettings
import com.byiara.api.settings.domain.SettingsRepository
import com.byiara.api.settings.domain.UpdateOperationalSettingsCommand
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class OperationalSettingsService(
    private val repository: SettingsRepository,
) {
    @Transactional(readOnly = true)
    fun getSettings(): OperationalSettings =
        OperationalSettings(
            appointmentBufferMinutes = appointmentBufferMinutes(),
            maxDailyBookings = maxDailyBookings(),
            minimumBookingNoticeHours = minimumBookingNoticeHours(),
            bookingReminderEnabled = bookingReminderEnabled(),
            bookingReminderHoursBefore = bookingReminderHoursBefore(),
        )

    @Transactional(readOnly = true)
    fun appointmentBufferMinutes(): Int =
        repository.findValue(APPOINTMENT_BUFFER_MINUTES_KEY)
            ?.toIntOrNull()
            ?.takeIf {
                it.toLong() in MIN_APPOINTMENT_BUFFER_MINUTES..MAX_APPOINTMENT_BUFFER_MINUTES &&
                    it % APPOINTMENT_BUFFER_INCREMENT_MINUTES == 0
            }
            ?: DEFAULT_APPOINTMENT_BUFFER_MINUTES

    @Transactional(readOnly = true)
    fun maxDailyBookings(): Int? =
        when (val storedValue = repository.findValue(MAX_DAILY_BOOKINGS_KEY)) {
            UNLIMITED_VALUE -> null
            null -> DEFAULT_MAX_DAILY_BOOKINGS
            else -> storedValue.toIntOrNull()?.takeIf { it >= MIN_MAX_DAILY_BOOKINGS }
                ?: DEFAULT_MAX_DAILY_BOOKINGS
        }

    @Transactional(readOnly = true)
    fun minimumBookingNoticeHours(): Int =
        repository.findValue(MINIMUM_BOOKING_NOTICE_HOURS_KEY)
            ?.toIntOrNull()
            ?.takeIf { it in MIN_BOOKING_NOTICE_HOURS..MAX_BOOKING_NOTICE_HOURS }
            ?: DEFAULT_MINIMUM_BOOKING_NOTICE_HOURS

    @Transactional(readOnly = true)
    fun bookingReminderEnabled(): Boolean =
        repository.findValue(BOOKING_REMINDER_ENABLED_KEY)?.toBooleanStrictOrNull()
            ?: DEFAULT_BOOKING_REMINDER_ENABLED

    @Transactional(readOnly = true)
    fun bookingReminderHoursBefore(): Int =
        repository.findValue(BOOKING_REMINDER_HOURS_BEFORE_KEY)
            ?.toIntOrNull()
            ?.takeIf { it in MIN_BOOKING_REMINDER_HOURS_BEFORE..MAX_BOOKING_REMINDER_HOURS_BEFORE }
            ?: DEFAULT_BOOKING_REMINDER_HOURS_BEFORE

    @Transactional
    fun updateSettings(command: UpdateOperationalSettingsCommand): OperationalSettings {
        val minimumNoticeHours = command.minimumBookingNoticeHours ?: minimumBookingNoticeHours()
        val reminderEnabled = command.bookingReminderEnabled ?: bookingReminderEnabled()
        val reminderHoursBefore = command.bookingReminderHoursBefore ?: bookingReminderHoursBefore()
        require(command.appointmentBufferMinutes.toLong() in MIN_APPOINTMENT_BUFFER_MINUTES..MAX_APPOINTMENT_BUFFER_MINUTES) {
            "Appointment buffer must be between $MIN_APPOINTMENT_BUFFER_MINUTES and $MAX_APPOINTMENT_BUFFER_MINUTES minutes"
        }
        require(command.appointmentBufferMinutes % APPOINTMENT_BUFFER_INCREMENT_MINUTES == 0) {
            "Appointment buffer must use $APPOINTMENT_BUFFER_INCREMENT_MINUTES-minute increments"
        }
        require(command.maxDailyBookings == null || command.maxDailyBookings >= MIN_MAX_DAILY_BOOKINGS) {
            "Maximum daily bookings must be at least $MIN_MAX_DAILY_BOOKINGS or unlimited"
        }
        require(minimumNoticeHours in MIN_BOOKING_NOTICE_HOURS..MAX_BOOKING_NOTICE_HOURS) {
            "Minimum booking notice must be between $MIN_BOOKING_NOTICE_HOURS and " +
                "$MAX_BOOKING_NOTICE_HOURS hours"
        }
        require(reminderHoursBefore in MIN_BOOKING_REMINDER_HOURS_BEFORE..MAX_BOOKING_REMINDER_HOURS_BEFORE) {
            "Booking reminder must be between $MIN_BOOKING_REMINDER_HOURS_BEFORE and " +
                "$MAX_BOOKING_REMINDER_HOURS_BEFORE hours before the appointment"
        }
        repository.upsertValue(APPOINTMENT_BUFFER_MINUTES_KEY, command.appointmentBufferMinutes.toString())
        repository.upsertValue(MAX_DAILY_BOOKINGS_KEY, command.maxDailyBookings?.toString() ?: UNLIMITED_VALUE)
        repository.upsertValue(MINIMUM_BOOKING_NOTICE_HOURS_KEY, minimumNoticeHours.toString())
        repository.upsertValue(BOOKING_REMINDER_ENABLED_KEY, reminderEnabled.toString())
        repository.upsertValue(BOOKING_REMINDER_HOURS_BEFORE_KEY, reminderHoursBefore.toString())
        return OperationalSettings(
            appointmentBufferMinutes = command.appointmentBufferMinutes,
            maxDailyBookings = command.maxDailyBookings,
            minimumBookingNoticeHours = minimumNoticeHours,
            bookingReminderEnabled = reminderEnabled,
            bookingReminderHoursBefore = reminderHoursBefore,
        )
    }

    companion object {
        const val MIN_APPOINTMENT_BUFFER_MINUTES = 0L
        const val MAX_APPOINTMENT_BUFFER_MINUTES = 180L
        const val DEFAULT_APPOINTMENT_BUFFER_MINUTES = 15
        const val APPOINTMENT_BUFFER_INCREMENT_MINUTES = 5
        const val MIN_MAX_DAILY_BOOKINGS = 1
        const val DEFAULT_MAX_DAILY_BOOKINGS = 3
        const val MIN_BOOKING_NOTICE_HOURS = 0
        const val MAX_BOOKING_NOTICE_HOURS = 8760
        const val DEFAULT_MINIMUM_BOOKING_NOTICE_HOURS = 0
        const val MIN_BOOKING_REMINDER_HOURS_BEFORE = 1
        const val MAX_BOOKING_REMINDER_HOURS_BEFORE = 168
        const val DEFAULT_BOOKING_REMINDER_HOURS_BEFORE = 24
        const val DEFAULT_BOOKING_REMINDER_ENABLED = false
        private const val APPOINTMENT_BUFFER_MINUTES_KEY = "appointment_buffer_minutes"
        private const val MAX_DAILY_BOOKINGS_KEY = "max_daily_bookings"
        private const val MINIMUM_BOOKING_NOTICE_HOURS_KEY = "minimum_booking_notice_hours"
        private const val BOOKING_REMINDER_ENABLED_KEY = "booking_reminder_enabled"
        private const val BOOKING_REMINDER_HOURS_BEFORE_KEY = "booking_reminder_hours_before"
        private const val UNLIMITED_VALUE = "unlimited"
    }
}
