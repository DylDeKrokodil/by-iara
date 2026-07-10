package com.byiara.api.availability.application

import com.byiara.api.availability.domain.*
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.*
import java.util.UUID

@Service
class AvailabilityService(
    private val availabilityRepository: AvailabilityRepository,
    @Value("\${by-iara.timezone:Europe/Brussels}")
    private val timezoneIdStr: String,
) {
    private val zoneId: ZoneId get() = ZoneId.of(timezoneIdStr)

    /** Today's date in the business timezone. */
    fun today(): LocalDate = LocalDate.now(zoneId)

    // --- Rules Management ---

    @Transactional(readOnly = true)
    fun listRules(): List<AvailabilityRule> = availabilityRepository.findAllRules()

    @Transactional(readOnly = true)
    fun getRule(id: UUID): AvailabilityRule =
        availabilityRepository.findRuleById(id) ?: throw AvailabilityRuleNotFoundException(id)

    @Transactional
    fun createRule(command: CreateAvailabilityRuleCommand): AvailabilityRule {
        if (command.startTime >= command.endTime) {
            throw InvalidAvailabilityRuleException("Start time must be before end time")
        }
        val existingRules = availabilityRepository.findAllRules().filter { it.dayOfWeek == command.dayOfWeek }
        val overlaps = existingRules.any { existing ->
            command.startTime < existing.endTime && command.endTime > existing.startTime
        }
        if (overlaps) {
            throw InvalidAvailabilityRuleException("Availability rule overlaps with an existing rule on ${command.dayOfWeek}")
        }
        return availabilityRepository.createRule(command)
    }

    @Transactional
    fun deleteRule(id: UUID) {
        if (!availabilityRepository.deleteRule(id)) {
            throw AvailabilityRuleNotFoundException(id)
        }
    }

    // --- Blocks Management ---

    @Transactional(readOnly = true)
    fun listBlocks(startAfter: OffsetDateTime? = null): List<AvailabilityBlock> =
        availabilityRepository.findAllBlocks(startAfter)

    @Transactional(readOnly = true)
    fun getBlock(id: UUID): AvailabilityBlock =
        availabilityRepository.findBlockById(id) ?: throw AvailabilityBlockNotFoundException(id)

    @Transactional
    fun createBlock(command: CreateAvailabilityBlockCommand): AvailabilityBlock {
        if (command.startTime >= command.endTime) {
            throw InvalidAvailabilityBlockException("Start time must be before end time")
        }
        return availabilityRepository.createBlock(command)
    }

    @Transactional
    fun deleteBlock(id: UUID) {
        if (!availabilityRepository.deleteBlock(id)) {
            throw AvailabilityBlockNotFoundException(id)
        }
    }

    // --- Availability Calculation ---

    /**
     * Whether a [durationMinutes] appointment starting at [start] fits entirely within a working
     * rule for that weekday, is in the future, and does not overlap a block. Does not consider
     * existing reservations — overlap with other bookings is enforced by the reservation domain.
     */
    @Transactional(readOnly = true)
    fun isAvailable(start: OffsetDateTime, durationMinutes: Int): Boolean {
        if (durationMinutes <= 0) {
            return false
        }
        if (!start.isAfter(OffsetDateTime.now(zoneId))) {
            return false
        }

        val localStart = start.atZoneSameInstant(zoneId).toLocalDateTime()
        val localEnd = localStart.plusMinutes(durationMinutes.toLong())

        // The appointment must fall inside a single same-day working rule.
        val fitsRule = localEnd.toLocalDate() == localStart.toLocalDate() &&
            availabilityRepository.findAllRules()
                .filter { it.dayOfWeek == localStart.dayOfWeek }
                .any { rule ->
                    !localStart.toLocalTime().isBefore(rule.startTime) &&
                        !localEnd.toLocalTime().isAfter(rule.endTime)
                }
        if (!fitsRule) {
            return false
        }

        val end = localEnd.atZone(zoneId).toOffsetDateTime()
        return availabilityRepository.findBlocksOverlapping(start, end).none { block ->
            start.isBefore(block.endTime) && end.isAfter(block.startTime)
        }
    }

    @Transactional(readOnly = true)
    fun findAvailableSlots(
        startDate: LocalDate,
        endDate: LocalDate,
        durationMinutes: Int
    ): List<OffsetDateTime> {
        if (startDate.isAfter(endDate)) {
            throw IllegalArgumentException("Start date cannot be after end date")
        }
        if (durationMinutes <= 0) {
            throw IllegalArgumentException("Duration must be positive")
        }

        // 1. Fetch rules and blocks
        val allRules = availabilityRepository.findAllRules()
        
        // Define query range in timezone-offset format
        val queryStart = startDate.atStartOfDay(zoneId).toOffsetDateTime()
        val queryEnd = endDate.plusDays(1).atStartOfDay(zoneId).toOffsetDateTime()
        val overlappingBlocks = availabilityRepository.findBlocksOverlapping(queryStart, queryEnd)

        val candidates = mutableListOf<Slot>()
        val now = OffsetDateTime.now(zoneId)

        // 2. Generate candidate slots based on rules
        var currentDate = startDate
        while (!currentDate.isAfter(endDate)) {
            val dayOfWeek = currentDate.dayOfWeek
            val dayRules = allRules.filter { it.dayOfWeek == dayOfWeek }

            for (rule in dayRules) {
                var candidateTime = rule.startTime
                // Generate slots in 15-minute increments. LocalTime arithmetic wraps at
                // midnight, so a candidate whose end wraps past 00:00 reads as "before"
                // rule.endTime again — without this check that wraparound spins forever.
                while (true) {
                    val candidateEndTime = candidateTime.plusMinutes(durationMinutes.toLong())
                    if (candidateEndTime.isBefore(candidateTime) || candidateEndTime > rule.endTime) {
                        break
                    }

                    val localStart = LocalDateTime.of(currentDate, candidateTime)
                    val localEnd = localStart.plusMinutes(durationMinutes.toLong())

                    val offsetStart = localStart.atZone(zoneId).toOffsetDateTime()
                    val offsetEnd = localEnd.atZone(zoneId).toOffsetDateTime()

                    // Candidate must be in the future
                    if (offsetStart.isAfter(now)) {
                        candidates.add(Slot(offsetStart, offsetEnd))
                    }

                    candidateTime = candidateTime.plusMinutes(15)
                }
            }
            currentDate = currentDate.plusDays(1)
        }

        // 3. Filter out candidates overlapping with any block
        val availableSlots = candidates.filter { slot ->
            overlappingBlocks.none { block ->
                slot.start.isBefore(block.endTime) && slot.end.isAfter(block.startTime)
            }
        }

        // 4. Return sorted unique start times
        return availableSlots
            .map { it.start }
            .distinct()
            .sorted()
    }

    private data class Slot(
        val start: OffsetDateTime,
        val end: OffsetDateTime,
    )
}
