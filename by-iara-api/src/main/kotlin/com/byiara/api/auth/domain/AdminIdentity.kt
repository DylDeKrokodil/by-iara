package com.byiara.api.auth.domain

data class AdminIdentity(
    val username: String,
    val role: AdminRole,
)

enum class AdminRole {
    ADMIN,
}
