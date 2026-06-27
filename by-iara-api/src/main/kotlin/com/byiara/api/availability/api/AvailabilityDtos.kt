package com.byiara.api.availability.api

import com.byiara.api.availability.domain.AvailabilityBlock
import com.byiara.api.availability.domain.AvailabilityRule
import com.byiara.api.availability.domain.CreateAvailabilityBlockCommand
import com.byiara.api.availability.domain.CreateAvailabilityRuleCommand
import jakarta.validation.constraints.NotNull
import java.time.DayOfWeek
import java.time.LocalTime
import java.time.OffsetDateTime
import java.util.UUID

data class AvailabilityRuleRequest(
    @field:NotNull
    val dayOfWeek: DayOfWeek,

    @field:NotNull
    val startTime: LocalTime,

    @field:NotNull
    val endTime: LocalTime,
) {
    fun toCommand(): CreateAvailabilityRuleCommand =
        CreateAvailabilityRuleCommand(
            dayOfWeek = dayOfWeek,
            startTime = startTime,
            endTime = endTime,
        )
}

data class AvailabilityRuleResponse(
    val id: UUID,
    val dayOfWeek: DayOfWeek,
    val startTime: LocalTime,
    val endTime: LocalTime,
)

fun AvailabilityRule.toResponse(): AvailabilityRuleResponse =
    AvailabilityRuleResponse(
        id = id,
        dayOfWeek = dayOfWeek,
        startTime = startTime,
        endTime = endTime,
    )

data class AvailabilityBlockRequest(
    @field:NotNull
    val startTime: OffsetDateTime,

    @field:NotNull
    val endTime: OffsetDateTime,

    val reason: String? = null,
) {
    fun toCommand(): CreateAvailabilityBlockCommand =
        CreateAvailabilityBlockCommand(
            startTime = startTime,
            endTime = endTime,
            reason = reason?.trim()?.ifBlank { null },
        )
}

data class AvailabilityBlockResponse(
    val id: UUID,
    val startTime: OffsetDateTime,
    val endTime: OffsetDateTime,
    val reason: String?,
)

fun AvailabilityBlock.toResponse(): AvailabilityBlockResponse =
    AvailabilityBlockResponse(
        id = id,
        startTime = startTime,
        endTime = endTime,
        reason = reason,
    )
