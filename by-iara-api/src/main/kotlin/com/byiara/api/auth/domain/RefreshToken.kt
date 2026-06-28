package com.byiara.api.auth.domain

import java.time.Instant
import java.util.UUID

data class RefreshToken(
    val id: UUID,
    val adminUserId: UUID,
    val expiresAt: Instant,
    val revokedAt: Instant?,
) {
    fun isActive(now: Instant): Boolean = revokedAt == null && expiresAt.isAfter(now)
}
