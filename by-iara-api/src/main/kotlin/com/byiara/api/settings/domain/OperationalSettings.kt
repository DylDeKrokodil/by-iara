package com.byiara.api.settings.domain

data class OperationalSettings(
    val appointmentBufferMinutes: Int,
)

data class UpdateOperationalSettingsCommand(
    val appointmentBufferMinutes: Int,
)
