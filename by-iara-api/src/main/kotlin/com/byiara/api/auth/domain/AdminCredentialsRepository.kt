package com.byiara.api.auth.domain

import java.util.UUID

interface AdminCredentialsRepository {
    fun findActiveCredentialsByEmail(email: String): AdminCredentials?

    fun findActiveIdentityById(id: UUID): AdminIdentity?
}
