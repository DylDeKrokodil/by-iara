package com.byiara.api.auth.domain

data class AdminLoginResult(
    val accessToken: AdminAccessToken,
    val expiresInSeconds: Long,
    val admin: AdminIdentity,
)
