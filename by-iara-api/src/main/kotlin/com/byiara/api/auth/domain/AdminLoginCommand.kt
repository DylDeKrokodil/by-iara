package com.byiara.api.auth.domain

data class AdminLoginCommand(
    val username: String,
    val password: String,
)
