package com.byiara.api.availability.api

import com.byiara.api.availability.application.AvailabilityService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.OffsetDateTime

@RestController
@RequestMapping("/api/availability")
class AvailabilityController(
    private val availabilityService: AvailabilityService,
) {
    @GetMapping
    fun getAvailability(
        @RequestParam
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        startDate: LocalDate,

        @RequestParam
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        endDate: LocalDate,

        @RequestParam(defaultValue = "60")
        durationMinutes: Int,
    ): List<OffsetDateTime> =
        availabilityService.findAvailableSlots(startDate, endDate, durationMinutes)
}
