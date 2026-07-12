package com.byiara.api.auth.domain

import java.util.UUID

interface AdminCredentialsRepository {
    fun findActiveCredentialsByEmail(email: String): AdminCredentials?

    fun findActiveIdentityById(id: UUID): AdminIdentity?

    /** Recipients for admin-facing notifications, e.g. a new reservation alert. */
    fun findActiveEmails(): List<String>

    /**
     * Takes a row lock on this admin, held until the caller's transaction ends, so that two
     * mutations scoped to the same admin (e.g. regenerating and revoking a calendar feed token)
     * serialize instead of racing.
     */
    fun lockForUpdate(id: UUID)
}
