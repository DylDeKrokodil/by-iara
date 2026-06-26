package com.byiara.api.auth.domain

import java.util.UUID

data class AdminCredentials(
    val id: UUID,
    val email: String,
    val passwordHash: String,
    val identity: AdminIdentity,
)
