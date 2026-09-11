package com.byiara.api.settings.domain

data class OperationalSettings(
    val appointmentBufferMinutes: Int,
    val maxDailyBookings: Int?,
    val minimumBookingNoticeHours: Int,
    val bookingReminderEnabled: Boolean,
    val bookingReminderHoursBefore: Int,
)

data class UpdateOperationalSettingsCommand(
    val appointmentBufferMinutes: Int,
    val maxDailyBookings: Int?,
    val minimumBookingNoticeHours: Int?,
    val bookingReminderEnabled: Boolean?,
    val bookingReminderHoursBefore: Int?,
)
