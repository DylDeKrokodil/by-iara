package com.byiara.api.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "by-iara.auth")
data class AdminAuthProperties(
    val admin: AdminCredentialsProperties = AdminCredentialsProperties(),
    val tokenTtlSeconds: Long = 3600,
)

data class AdminCredentialsProperties(
    val username: String = "admin",
    val password: String = "ChangeMe123!",
)
