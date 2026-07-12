package com.byiara.api.calendar.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "by-iara.calendar-feed")
data class CalendarFeedProperties(
    val pastDays: Long = 7,
    val futureDays: Long = 180,
)
