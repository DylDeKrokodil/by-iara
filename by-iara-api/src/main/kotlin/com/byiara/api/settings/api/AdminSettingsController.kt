package com.byiara.api.settings.api

import com.byiara.api.settings.application.OperationalSettingsService
import com.byiara.api.settings.domain.OperationalSettings
import com.byiara.api.settings.domain.UpdateOperationalSettingsCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.AssertTrue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin/settings")
class AdminSettingsController(
    private val settingsService: OperationalSettingsService,
) {
    @GetMapping
    fun getSettings(): SettingsResponse = settingsService.getSettings().toResponse()

    @PutMapping
    fun updateSettings(@Valid @RequestBody request: UpdateSettingsRequest): SettingsResponse =
        settingsService.updateSettings(request.toCommand()).toResponse()
}

data class SettingsResponse(
    val appointmentBufferMinutes: Int,
)

data class UpdateSettingsRequest(
    @field:Min(OperationalSettingsService.MIN_APPOINTMENT_BUFFER_MINUTES)
    @field:Max(OperationalSettingsService.MAX_APPOINTMENT_BUFFER_MINUTES)
    val appointmentBufferMinutes: Int,
) {
    @get:AssertTrue(message = "appointmentBufferMinutes must use 5-minute increments")
    val appointmentBufferIncrementValid: Boolean
        get() = appointmentBufferMinutes % OperationalSettingsService.APPOINTMENT_BUFFER_INCREMENT_MINUTES == 0
}

private fun UpdateSettingsRequest.toCommand() =
    UpdateOperationalSettingsCommand(appointmentBufferMinutes = appointmentBufferMinutes)

private fun OperationalSettings.toResponse() =
    SettingsResponse(appointmentBufferMinutes = appointmentBufferMinutes)
