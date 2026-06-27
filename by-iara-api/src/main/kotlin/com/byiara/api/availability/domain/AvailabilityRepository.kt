package com.byiara.api.availability.domain

import java.time.DayOfWeek
import java.time.OffsetDateTime
import java.util.UUID

interface AvailabilityRepository {
    // Rules management
    fun findAllRules(): List<AvailabilityRule>
    fun findRuleById(id: UUID): AvailabilityRule?
    fun createRule(command: CreateAvailabilityRuleCommand): AvailabilityRule
    fun deleteRule(id: UUID): Boolean

    // Blocks management
    fun findAllBlocks(startAfter: OffsetDateTime? = null): List<AvailabilityBlock>
    fun findBlocksOverlapping(start: OffsetDateTime, end: OffsetDateTime): List<AvailabilityBlock>
    fun findBlockById(id: UUID): AvailabilityBlock?
    fun createBlock(command: CreateAvailabilityBlockCommand): AvailabilityBlock
    fun deleteBlock(id: UUID): Boolean
}
