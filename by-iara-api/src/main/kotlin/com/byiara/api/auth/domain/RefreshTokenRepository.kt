package com.byiara.api.auth.domain

import java.time.Instant
import java.util.UUID

interface RefreshTokenRepository {
    fun save(adminUserId: UUID, tokenHash: String, expiresAt: Instant)

    fun findByHash(tokenHash: String): RefreshToken?

    fun revoke(id: UUID, revokedAt: Instant)

    fun revokeAllForAdmin(adminUserId: UUID, revokedAt: Instant)
}
