package com.byiara.api.availability.infrastructure.persistence

import com.byiara.api.availability.domain.AvailabilityBlock
import com.byiara.api.availability.domain.AvailabilityRepository
import com.byiara.api.availability.domain.AvailabilityRule
import com.byiara.api.availability.domain.CreateAvailabilityBlockCommand
import com.byiara.api.availability.domain.CreateAvailabilityRuleCommand
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.noCondition
import org.jooq.impl.DSL.table
import org.jooq.impl.DSL.field
import org.springframework.stereotype.Repository
import java.time.DayOfWeek
import java.time.LocalTime
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqAvailabilityRepository(
    private val dsl: DSLContext,
) : AvailabilityRepository {

    private val rules = table(name("availability_rules"))
    private val rId = field(name("id"), UUID::class.java)
    private val rDayOfWeek = field(name("day_of_week"), Int::class.java)
    private val rStartTime = field(name("start_time"), LocalTime::class.java)
    private val rEndTime = field(name("end_time"), LocalTime::class.java)

    private val blocks = table(name("availability_blocks"))
    private val bId = field(name("id"), UUID::class.java)
    private val bStartTime = field(name("start_time"), OffsetDateTime::class.java)
    private val bEndTime = field(name("end_time"), OffsetDateTime::class.java)
    private val bReason = field(name("reason"), String::class.java)

    override fun findAllRules(): List<AvailabilityRule> {
        return dsl
            .select(rId, rDayOfWeek, rStartTime, rEndTime)
            .from(rules)
            .orderBy(rDayOfWeek.asc(), rStartTime.asc())
            .fetch()
            .map { mapRule(it) }
    }

    override fun findRuleById(id: UUID): AvailabilityRule? {
        val record = dsl
            .select(rId, rDayOfWeek, rStartTime, rEndTime)
            .from(rules)
            .where(rId.eq(id))
            .fetchOne() ?: return null
        return mapRule(record)
    }

    override fun createRule(command: CreateAvailabilityRuleCommand): AvailabilityRule {
        val newId = dsl
            .insertInto(rules)
            .columns(rDayOfWeek, rStartTime, rEndTime)
            .values(command.dayOfWeek.value, command.startTime, command.endTime)
            .returning(rId)
            .fetchOne()!!
            .get(rId)

        return findRuleById(newId)!!
    }

    override fun deleteRule(id: UUID): Boolean {
        return dsl
            .deleteFrom(rules)
            .where(rId.eq(id))
            .execute() > 0
    }

    override fun findAllBlocks(startAfter: OffsetDateTime?): List<AvailabilityBlock> {
        val condition = if (startAfter != null) {
            bStartTime.greaterOrEqual(startAfter)
        } else {
            noCondition()
        }

        return dsl
            .select(bId, bStartTime, bEndTime, bReason)
            .from(blocks)
            .where(condition)
            .orderBy(bStartTime.asc())
            .fetch()
            .map { mapBlock(it) }
    }

    override fun findBlocksOverlapping(start: OffsetDateTime, end: OffsetDateTime): List<AvailabilityBlock> {
        // Overlap logic: block.startTime < end AND block.endTime > start
        return dsl
            .select(bId, bStartTime, bEndTime, bReason)
            .from(blocks)
            .where(bStartTime.lt(end).and(bEndTime.gt(start)))
            .orderBy(bStartTime.asc())
            .fetch()
            .map { mapBlock(it) }
    }

    override fun findBlockById(id: UUID): AvailabilityBlock? {
        val record = dsl
            .select(bId, bStartTime, bEndTime, bReason)
            .from(blocks)
            .where(bId.eq(id))
            .fetchOne() ?: return null
        return mapBlock(record)
    }

    override fun createBlock(command: CreateAvailabilityBlockCommand): AvailabilityBlock {
        val newId = dsl
            .insertInto(blocks)
            .columns(bStartTime, bEndTime, bReason)
            .values(command.startTime, command.endTime, command.reason)
            .returning(bId)
            .fetchOne()!!
            .get(bId)

        return findBlockById(newId)!!
    }

    override fun deleteBlock(id: UUID): Boolean {
        return dsl
            .deleteFrom(blocks)
            .where(bId.eq(id))
            .execute() > 0
    }

    private fun mapRule(record: Record): AvailabilityRule =
        AvailabilityRule(
            id = record.get(rId),
            dayOfWeek = DayOfWeek.of(record.get(rDayOfWeek)),
            startTime = record.get(rStartTime),
            endTime = record.get(rEndTime),
        )

    private fun mapBlock(record: Record): AvailabilityBlock =
        AvailabilityBlock(
            id = record.get(bId),
            startTime = record.get(bStartTime),
            endTime = record.get(bEndTime),
            reason = record.get(bReason),
        )
}
