package com.byiara.api.auth.domain

data class AdminIdentity(
    val email: String,
    val role: AdminRole,
)

enum class AdminRole {
    ADMIN,
}
