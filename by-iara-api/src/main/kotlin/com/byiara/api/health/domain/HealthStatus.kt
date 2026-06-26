package com.byiara.api.health.domain

import java.time.OffsetDateTime

data class HealthStatus(
    val status: String,
    val service: String,
    val timestamp: OffsetDateTime,
)
