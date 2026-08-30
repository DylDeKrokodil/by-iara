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
        OperationalSettings(appointmentBufferMinutes = appointmentBufferMinutes())

    @Transactional(readOnly = true)
    fun appointmentBufferMinutes(): Int =
        repository.findValue(APPOINTMENT_BUFFER_MINUTES_KEY)
            ?.toIntOrNull()
            ?.takeIf {
                it.toLong() in MIN_APPOINTMENT_BUFFER_MINUTES..MAX_APPOINTMENT_BUFFER_MINUTES &&
                    it % APPOINTMENT_BUFFER_INCREMENT_MINUTES == 0
            }
            ?: DEFAULT_APPOINTMENT_BUFFER_MINUTES

    @Transactional
    fun updateSettings(command: UpdateOperationalSettingsCommand): OperationalSettings {
        require(command.appointmentBufferMinutes.toLong() in MIN_APPOINTMENT_BUFFER_MINUTES..MAX_APPOINTMENT_BUFFER_MINUTES) {
            "Appointment buffer must be between $MIN_APPOINTMENT_BUFFER_MINUTES and $MAX_APPOINTMENT_BUFFER_MINUTES minutes"
        }
        require(command.appointmentBufferMinutes % APPOINTMENT_BUFFER_INCREMENT_MINUTES == 0) {
            "Appointment buffer must use $APPOINTMENT_BUFFER_INCREMENT_MINUTES-minute increments"
        }
        repository.upsertValue(APPOINTMENT_BUFFER_MINUTES_KEY, command.appointmentBufferMinutes.toString())
        return OperationalSettings(command.appointmentBufferMinutes)
    }

    companion object {
        const val MIN_APPOINTMENT_BUFFER_MINUTES = 0L
        const val MAX_APPOINTMENT_BUFFER_MINUTES = 180L
        const val DEFAULT_APPOINTMENT_BUFFER_MINUTES = 15
        const val APPOINTMENT_BUFFER_INCREMENT_MINUTES = 5
        private const val APPOINTMENT_BUFFER_MINUTES_KEY = "appointment_buffer_minutes"
    }
}
