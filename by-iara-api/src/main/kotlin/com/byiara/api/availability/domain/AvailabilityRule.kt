package com.byiara.api.availability.domain

import java.time.DayOfWeek
import java.time.LocalTime
import java.util.UUID

data class AvailabilityRule(
    val id: UUID,
    val dayOfWeek: DayOfWeek,
    val startTime: LocalTime,
    val endTime: LocalTime,
) {
    init {
        require(startTime < endTime) { "Start time must be before end time" }
    }
}

data class CreateAvailabilityRuleCommand(
    val dayOfWeek: DayOfWeek,
    val startTime: LocalTime,
    val endTime: LocalTime,
)
