package com.byiara.api.calendar.domain

import java.time.Instant
import java.util.UUID

interface CalendarFeedTokenRepository {
    fun save(adminUserId: UUID, tokenHash: String, createdAt: Instant)

    fun findByHash(tokenHash: String): CalendarFeedToken?

    fun findActiveForAdmin(adminUserId: UUID): CalendarFeedToken?

    fun revokeAllForAdmin(adminUserId: UUID, revokedAt: Instant)
}
