package com.byiara.api.common.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.ZoneId

@ConfigurationProperties(prefix = "by-iara")
data class BusinessTimeProperties(
    val timezone: String = DEFAULT_TIMEZONE,
) {
    val zoneId: ZoneId = ZoneId.of(timezone)

    companion object {
        const val DEFAULT_TIMEZONE = "Europe/Lisbon"
    }
}
