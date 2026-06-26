package com.byiara.api.auth.domain

data class AdminLoginCommand(
    val email: String,
    val password: String,
)
