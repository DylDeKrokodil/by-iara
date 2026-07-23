package com.byiara.api.common.ratelimit

import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.time.Duration
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.HexFormat

enum class PublicRateLimitScope {
    BOOKING_EMAIL,
    CUSTOMER_ACCESS_EMAIL,
}

@Component
class PublicRequestRateLimiter(
    private val dsl: DSLContext,
    private val properties: PublicRateLimitProperties,
) {
    private val limits = table(name("public_request_rate_limits"))
    private val scopeField = field(name("public_request_rate_limits", "scope"), String::class.java)
    private val keyHashField = field(name("public_request_rate_limits", "key_hash"), String::class.java)
    private val windowStartedAtField =
        field(name("public_request_rate_limits", "window_started_at"), OffsetDateTime::class.java)
    private val requestCountField =
        field(name("public_request_rate_limits", "request_count"), Int::class.java)
    private val updatedAtField =
        field(name("public_request_rate_limits", "updated_at"), OffsetDateTime::class.java)

    @Transactional(noRollbackFor = [PublicRateLimitExceededException::class])
    fun consumeBookingEmail(email: String) {
        consume(PublicRateLimitScope.BOOKING_EMAIL, email, properties.bookingEmailMaxRequests)
    }

    @Transactional(noRollbackFor = [PublicRateLimitExceededException::class])
    fun consumeCustomerAccessEmail(email: String) {
        consume(
            PublicRateLimitScope.CUSTOMER_ACCESS_EMAIL,
            email,
            properties.customerAccessEmailMaxRequests,
        )
    }

    /**
     * A database row lock makes the counter atomic across API instances. The exception is excluded
     * from rollback so rejected requests still count and cannot repeatedly retry a stale counter.
     */
    private fun consume(scope: PublicRateLimitScope, rawKey: String, maxRequests: Int) {
        require(properties.windowSeconds > 0) { "Public rate-limit window must be positive" }
        require(maxRequests > 0) { "Public rate-limit maximum must be positive" }

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val keyHash = hash(rawKey.trim().lowercase())

        val inserted = dsl.insertInto(limits)
            .columns(
                scopeField,
                keyHashField,
                windowStartedAtField,
                requestCountField,
                updatedAtField,
            )
            .values(scope.name, keyHash, now, 1, now)
            .onConflict(scopeField, keyHashField)
            .doNothing()
            .execute()

        if (inserted == 1) {
            return
        }

        val current = dsl.select(windowStartedAtField, requestCountField)
            .from(limits)
            .where(scopeField.eq(scope.name).and(keyHashField.eq(keyHash)))
            .forUpdate()
            .fetchOne()
            ?: error("Rate-limit bucket disappeared while it was locked")

        val startedAt = current.get(windowStartedAtField)
        val count = current.get(requestCountField)
        val windowEnd = startedAt.plusSeconds(properties.windowSeconds)

        if (!now.isBefore(windowEnd)) {
            dsl.update(limits)
                .set(windowStartedAtField, now)
                .set(requestCountField, 1)
                .set(updatedAtField, now)
                .where(scopeField.eq(scope.name).and(keyHashField.eq(keyHash)))
                .execute()
            return
        }

        val nextCount = count + 1
        dsl.update(limits)
            .set(requestCountField, nextCount)
            .set(updatedAtField, now)
            .where(scopeField.eq(scope.name).and(keyHashField.eq(keyHash)))
            .execute()

        if (nextCount > maxRequests) {
            val remaining = Duration.between(now, windowEnd)
            val retryAfter = (remaining.seconds + if (remaining.nano > 0) 1 else 0).coerceAtLeast(1)
            throw PublicRateLimitExceededException(retryAfter)
        }
    }

    private fun hash(value: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toByteArray()))
}
