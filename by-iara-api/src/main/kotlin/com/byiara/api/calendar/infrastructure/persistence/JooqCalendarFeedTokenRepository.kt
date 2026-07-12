package com.byiara.api.calendar.infrastructure.persistence

import com.byiara.api.calendar.domain.CalendarFeedToken
import com.byiara.api.calendar.domain.CalendarFeedTokenRepository
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Repository
class JooqCalendarFeedTokenRepository(
    private val dsl: DSLContext,
) : CalendarFeedTokenRepository {
    private val calendarFeedTokens = table(name("calendar_feed_tokens"))
    private val id = field(name("id"), UUID::class.java)
    private val adminUserId = field(name("admin_user_id"), UUID::class.java)
    private val tokenHash = field(name("token_hash"), String::class.java)
    private val createdAt = field(name("created_at"), OffsetDateTime::class.java)
    private val revokedAt = field(name("revoked_at"), OffsetDateTime::class.java)

    override fun save(adminUserId: UUID, tokenHash: String, createdAt: Instant) {
        dsl.insertInto(calendarFeedTokens)
            .columns(this.adminUserId, this.tokenHash, this.createdAt)
            .values(adminUserId, tokenHash, createdAt.atOffset(ZoneOffset.UTC))
            .execute()
    }

    override fun findByHash(tokenHash: String): CalendarFeedToken? =
        dsl
            .select(id, adminUserId, createdAt, revokedAt)
            .from(calendarFeedTokens)
            .where(this.tokenHash.eq(tokenHash))
            .fetchOne { record ->
                CalendarFeedToken(
                    id = record.get(id),
                    adminUserId = record.get(adminUserId),
                    createdAt = record.get(createdAt).toInstant(),
                    revokedAt = record.get(revokedAt)?.toInstant(),
                )
            }

    override fun findActiveForAdmin(adminUserId: UUID): CalendarFeedToken? =
        dsl
            .select(id, this.adminUserId, createdAt, revokedAt)
            .from(calendarFeedTokens)
            .where(this.adminUserId.eq(adminUserId))
            .and(revokedAt.isNull)
            .fetchOne { record ->
                CalendarFeedToken(
                    id = record.get(id),
                    adminUserId = record.get(this.adminUserId),
                    createdAt = record.get(createdAt).toInstant(),
                    revokedAt = record.get(revokedAt)?.toInstant(),
                )
            }

    override fun revokeAllForAdmin(adminUserId: UUID, revokedAt: Instant) {
        dsl.update(calendarFeedTokens)
            .set(this.revokedAt, revokedAt.atOffset(ZoneOffset.UTC))
            .where(this.adminUserId.eq(adminUserId))
            .and(this.revokedAt.isNull)
            .execute()
    }
}
