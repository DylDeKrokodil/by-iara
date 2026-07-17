package com.byiara.api.auth.domain

import java.time.OffsetDateTime

enum class AdminLoginThrottleScope {
    CLIENT,
    CLIENT_EMAIL,
}

data class AdminLoginFailureWindow(
    val count: Int,
    val oldestFailureAt: OffsetDateTime?,
)

interface AdminLoginAttemptRepository {
    fun recordFailure(scope: AdminLoginThrottleScope, keyHash: String, failedAt: OffsetDateTime)

    fun failureWindow(
        scope: AdminLoginThrottleScope,
        keyHash: String,
        since: OffsetDateTime,
    ): AdminLoginFailureWindow

    fun clear(scope: AdminLoginThrottleScope, keyHash: String)

    fun deleteBefore(cutoff: OffsetDateTime)
}
