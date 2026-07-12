package com.byiara.api.calendar.application

import com.byiara.api.auth.domain.AdminCredentialsRepository
import com.byiara.api.calendar.domain.CalendarFeedLinks
import com.byiara.api.calendar.domain.CalendarFeedStatus
import com.byiara.api.calendar.domain.CalendarFeedTokenRepository
import com.byiara.api.calendar.domain.InvalidCalendarFeedTokenException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64
import java.util.UUID

@Component
class CalendarFeedTokenService(
    private val calendarFeedTokenRepository: CalendarFeedTokenRepository,
    private val adminCredentialsRepository: AdminCredentialsRepository,
    @Value("\${by-iara.admin-url}")
    private val adminUrl: String,
) {
    private val secureRandom = SecureRandom()
    private val encoder = Base64.getUrlEncoder().withoutPadding()

    @Transactional(readOnly = true)
    fun status(adminUserId: UUID): CalendarFeedStatus {
        val token = calendarFeedTokenRepository.findActiveForAdmin(adminUserId)
        return CalendarFeedStatus(active = token != null, createdAt = token?.createdAt)
    }

    /** Revokes any existing active token for this admin and issues a fresh one, returning its subscribe URLs. */
    @Transactional
    fun regenerate(adminUserId: UUID): CalendarFeedLinks {
        adminCredentialsRepository.lockForUpdate(adminUserId)
        val now = Instant.now()
        calendarFeedTokenRepository.revokeAllForAdmin(adminUserId, now)
        val rawToken = generateRawToken()
        calendarFeedTokenRepository.save(adminUserId, hash(rawToken), now)
        return buildLinks(rawToken)
    }

    @Transactional
    fun revoke(adminUserId: UUID) {
        adminCredentialsRepository.lockForUpdate(adminUserId)
        calendarFeedTokenRepository.revokeAllForAdmin(adminUserId, Instant.now())
    }

    /**
     * Validates a raw feed token: it must be active, and the admin it was issued to must still be
     * active too - otherwise a deactivated admin's link would keep serving the live schedule
     * indefinitely, since nothing else in the system revokes a deactivated admin's existing tokens.
     * The feed content itself still isn't scoped per admin (every admin sees the same business-wide
     * list); this only ever checks liveness, never returns the admin id to the caller.
     */
    @Transactional(readOnly = true)
    fun requireValid(rawToken: String) {
        val stored = calendarFeedTokenRepository.findByHash(hash(rawToken))
        if (stored == null || !stored.isActive()) {
            throw InvalidCalendarFeedTokenException()
        }
        if (adminCredentialsRepository.findActiveIdentityById(stored.adminUserId) == null) {
            throw InvalidCalendarFeedTokenException()
        }
    }

    private fun buildLinks(rawToken: String): CalendarFeedLinks {
        val httpsUrl = "$adminUrl/api/calendar-feed/$rawToken.ics"
        val webcalUrl = httpsUrl.replaceFirst(Regex("^https?://"), "webcal://")
        return CalendarFeedLinks(httpsUrl, webcalUrl)
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
