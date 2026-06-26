package com.byiara.api.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "by-iara.auth")
data class AdminAuthProperties(
    val tokenTtlSeconds: Long = 3600,
    val jwtIssuer: String = "by-iara-api",
    val jwtSecret: String = "local-development-secret-must-be-at-least-32-bytes",
)
