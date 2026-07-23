package com.byiara.api.common.ratelimit

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "by-iara.public-rate-limit")
data class PublicRateLimitProperties(
    val windowSeconds: Long = 60,
    val bookingEmailMaxRequests: Int = 5,
    val customerAccessEmailMaxRequests: Int = 2,
)
