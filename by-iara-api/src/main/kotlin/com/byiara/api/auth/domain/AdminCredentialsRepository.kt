package com.byiara.api.auth.domain

import java.util.UUID

interface AdminCredentialsRepository {
    fun findActiveCredentialsByEmail(email: String): AdminCredentials?

    fun findActiveIdentityById(id: UUID): AdminIdentity?

    /** Recipients for admin-facing notifications, e.g. a new reservation alert. */
    fun findActiveEmails(): List<String>
}
