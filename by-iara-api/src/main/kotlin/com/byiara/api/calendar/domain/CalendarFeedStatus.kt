package com.byiara.api.calendar.domain

import java.time.Instant

data class CalendarFeedStatus(
    val active: Boolean,
    val createdAt: Instant?,
)
