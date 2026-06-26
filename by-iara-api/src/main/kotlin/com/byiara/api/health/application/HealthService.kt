package com.byiara.api.health.application

import com.byiara.api.health.domain.HealthStatus
import org.springframework.stereotype.Service
import java.time.OffsetDateTime

@Service
class HealthService {
    fun currentStatus(): HealthStatus =
        HealthStatus(
            status = "UP",
            service = "by-iara-api",
            timestamp = OffsetDateTime.now(),
        )
}
