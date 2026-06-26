package com.byiara.api.auth.domain

interface AdminCredentialsRepository {
    fun findActiveCredentialsByEmail(email: String): AdminCredentials?
}
