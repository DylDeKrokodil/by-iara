package com.byiara.api.availability.domain

import java.time.OffsetDateTime
import java.util.UUID

data class AvailabilityBlock(
    val id: UUID,
    val startTime: OffsetDateTime,
    val endTime: OffsetDateTime,
    val reason: String?,
) {
    init {
        require(startTime < endTime) { "Start time must be before end time" }
    }
}

data class CreateAvailabilityBlockCommand(
    val startTime: OffsetDateTime,
    val endTime: OffsetDateTime,
    val reason: String?,
)
