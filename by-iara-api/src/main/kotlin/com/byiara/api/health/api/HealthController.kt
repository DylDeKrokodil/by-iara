package com.byiara.api.health.api

import com.byiara.api.health.application.HealthService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime

@RestController
class HealthController(
    private val healthService: HealthService,
) {
    @GetMapping("/health")
    fun health(): HealthResponse {
        val status = healthService.currentStatus()

        return HealthResponse(
            status = status.status,
            service = status.service,
            timestamp = status.timestamp,
        )
    }
}

data class HealthResponse(
    val status: String,
    val service: String,
    val timestamp: OffsetDateTime,
)
