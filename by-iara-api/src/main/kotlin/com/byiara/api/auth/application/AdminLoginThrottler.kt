package com.byiara.api.auth.application

import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.domain.AdminLoginAttemptRepository
import com.byiara.api.auth.domain.AdminLoginThrottleScope
import com.byiara.api.auth.domain.LoginRateLimitExceededException
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.time.Duration
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.HexFormat

@Component
class AdminLoginThrottler(
    private val repository: AdminLoginAttemptRepository,
    private val properties: AdminAuthProperties,
) {
    fun checkAllowed(clientAddress: String, email: String) {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        limits(clientAddress, email).forEach { limit ->
            enforce(limit, now)
        }
    }

    fun recordFailure(clientAddress: String, email: String) {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val limits = limits(clientAddress, email)

        limits.forEach { limit ->
            repository.recordFailure(limit.scope, limit.keyHash, now)
        }
        repository.deleteBefore(now.minusSeconds(properties.loginWindowSeconds * 4))
        limits.forEach { limit ->
            enforce(limit, now)
        }
    }

    fun recordSuccess(clientAddress: String, email: String) {
        val pair = pairLimit(clientAddress, email)
        repository.clear(pair.scope, pair.keyHash)
    }

    private fun enforce(limit: Limit, now: OffsetDateTime) {
        val window = repository.failureWindow(
            scope = limit.scope,
            keyHash = limit.keyHash,
            since = now.minusSeconds(properties.loginWindowSeconds),
        )
        if (window.count < limit.maxFailures) return

        val retryAt = requireNotNull(window.oldestFailureAt).plusSeconds(properties.loginWindowSeconds)
        val remaining = Duration.between(now, retryAt)
        val retryAfter = (remaining.seconds + if (remaining.nano > 0) 1 else 0).coerceAtLeast(1)
        throw LoginRateLimitExceededException(retryAfter)
    }

    private fun limits(clientAddress: String, email: String): List<Limit> =
        listOf(
            pairLimit(clientAddress, email),
            Limit(
                scope = AdminLoginThrottleScope.CLIENT,
                keyHash = hash(normalizeClient(clientAddress)),
                maxFailures = properties.loginIpMaxFailures,
            ),
        )

    private fun pairLimit(clientAddress: String, email: String): Limit =
        Limit(
            scope = AdminLoginThrottleScope.CLIENT_EMAIL,
            keyHash = hash("${normalizeClient(clientAddress)}\u0000${email.trim().lowercase()}"),
            maxFailures = properties.loginPairMaxFailures,
        )

    private fun normalizeClient(clientAddress: String): String =
        clientAddress.trim().lowercase().ifBlank { "unknown" }

    private fun hash(value: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toByteArray()))

    private data class Limit(
        val scope: AdminLoginThrottleScope,
        val keyHash: String,
        val maxFailures: Int,
    )
}
