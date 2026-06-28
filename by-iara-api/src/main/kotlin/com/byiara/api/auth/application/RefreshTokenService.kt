package com.byiara.api.auth.application

import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.domain.InvalidRefreshTokenException
import com.byiara.api.auth.domain.RefreshTokenRepository
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64
import java.util.UUID

@Component
class RefreshTokenService(
    private val refreshTokenRepository: RefreshTokenRepository,
    private val properties: AdminAuthProperties,
) {
    private val secureRandom = SecureRandom()
    private val encoder = Base64.getUrlEncoder().withoutPadding()

    /** Generates a new opaque refresh token, persists its hash, and returns the raw value. */
    fun issue(adminUserId: UUID): String {
        val rawToken = generateRawToken()
        val expiresAt = Instant.now().plusSeconds(properties.refreshTokenTtlSeconds)
        refreshTokenRepository.save(adminUserId, hash(rawToken), expiresAt)
        return rawToken
    }

    /**
     * Validates a refresh token and rotates it: the presented token is revoked and the caller is
     * expected to issue a fresh one. Presenting an already-revoked token is treated as reuse (likely
     * theft), so the whole token family for that admin is revoked.
     */
    fun rotate(rawToken: String): UUID {
        val now = Instant.now()
        val stored = refreshTokenRepository.findByHash(hash(rawToken))
            ?: throw InvalidRefreshTokenException()

        if (stored.revokedAt != null) {
            refreshTokenRepository.revokeAllForAdmin(stored.adminUserId, now)
            throw InvalidRefreshTokenException()
        }

        if (!stored.isActive(now)) {
            throw InvalidRefreshTokenException()
        }

        refreshTokenRepository.revoke(stored.id, now)
        return stored.adminUserId
    }

    /** Revokes a refresh token on logout. Silently ignores unknown tokens. */
    fun revoke(rawToken: String) {
        val stored = refreshTokenRepository.findByHash(hash(rawToken)) ?: return
        refreshTokenRepository.revoke(stored.id, Instant.now())
    }

    private fun generateRawToken(): String {
        val bytes = ByteArray(32)
        secureRandom.nextBytes(bytes)
        return encoder.encodeToString(bytes)
    }

    private fun hash(rawToken: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(rawToken.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
