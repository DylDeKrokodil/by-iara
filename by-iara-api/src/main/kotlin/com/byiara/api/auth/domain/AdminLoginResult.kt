package com.byiara.api.auth.domain

data class AdminLoginResult(
    val accessToken: AdminAccessToken,
    val refreshToken: String,
    val expiresInSeconds: Long,
    val admin: AdminIdentity,
)
