package com.byiara.api.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "by-iara.auth.initial-admin")
data class InitialAdminProperties(
    val enabled: Boolean = false,
    val email: String = "",
    val password: String = "",
)
