package com.byiara.api.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "by-iara.auth")
data class AdminAuthProperties(
    val tokenTtlSeconds: Long = 3600,
    val refreshTokenTtlSeconds: Long = 1_209_600,
    val jwtIssuer: String = "by-iara-api",
    val jwtSecret: String = "local-development-secret-must-be-at-least-32-bytes",
    val refreshCookieSecure: Boolean = false,
    val loginWindowSeconds: Long = 900,
    val loginPairMaxFailures: Int = 5,
    val loginIpMaxFailures: Int = 20,
)
