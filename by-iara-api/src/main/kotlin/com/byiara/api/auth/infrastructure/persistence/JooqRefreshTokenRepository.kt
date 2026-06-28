package com.byiara.api.auth.infrastructure.persistence

import com.byiara.api.auth.domain.RefreshToken
import com.byiara.api.auth.domain.RefreshTokenRepository
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
class JooqRefreshTokenRepository(
    private val dsl: DSLContext,
) : RefreshTokenRepository {
    private val refreshTokens = table(name("refresh_tokens"))
    private val id = field(name("id"), UUID::class.java)
    private val adminUserId = field(name("admin_user_id"), UUID::class.java)
    private val tokenHash = field(name("token_hash"), String::class.java)
    private val expiresAt = field(name("expires_at"), OffsetDateTime::class.java)
    private val revokedAt = field(name("revoked_at"), OffsetDateTime::class.java)

    override fun save(adminUserId: UUID, tokenHash: String, expiresAt: Instant) {
        dsl.insertInto(refreshTokens)
            .columns(this.adminUserId, this.tokenHash, this.expiresAt)
            .values(adminUserId, tokenHash, expiresAt.atOffset(ZoneOffset.UTC))
            .execute()
    }

    override fun findByHash(tokenHash: String): RefreshToken? =
        dsl
            .select(id, adminUserId, expiresAt, revokedAt)
            .from(refreshTokens)
            .where(this.tokenHash.eq(tokenHash))
            .fetchOne { record ->
                RefreshToken(
                    id = record.get(id),
                    adminUserId = record.get(adminUserId),
                    expiresAt = record.get(expiresAt).toInstant(),
                    revokedAt = record.get(revokedAt)?.toInstant(),
                )
            }

    override fun revoke(id: UUID, revokedAt: Instant) {
        dsl.update(refreshTokens)
            .set(this.revokedAt, revokedAt.atOffset(ZoneOffset.UTC))
            .where(this.id.eq(id))
            .and(this.revokedAt.isNull)
            .execute()
    }

    override fun revokeAllForAdmin(adminUserId: UUID, revokedAt: Instant) {
        dsl.update(refreshTokens)
            .set(this.revokedAt, revokedAt.atOffset(ZoneOffset.UTC))
            .where(this.adminUserId.eq(adminUserId))
            .and(this.revokedAt.isNull)
            .execute()
    }
}
