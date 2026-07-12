package com.byiara.api.calendar.domain

import java.time.Instant
import java.util.UUID

data class CalendarFeedToken(
    val id: UUID,
    val adminUserId: UUID,
    val createdAt: Instant,
    val revokedAt: Instant?,
) {
    fun isActive(): Boolean = revokedAt == null
}
