package com.byiara.api.auth.infrastructure.persistence

import com.byiara.api.auth.domain.AdminLoginAttemptRepository
import com.byiara.api.auth.domain.AdminLoginFailureWindow
import com.byiara.api.auth.domain.AdminLoginThrottleScope
import org.jooq.DSLContext
import org.jooq.impl.DSL.count
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.min
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

@Repository
class JooqAdminLoginAttemptRepository(
    private val dsl: DSLContext,
) : AdminLoginAttemptRepository {
    private val attempts = table(name("admin_login_attempts"))
    private val scopeField = field(name("scope"), String::class.java)
    private val keyHashField = field(name("key_hash"), String::class.java)
    private val failedAtField = field(name("failed_at"), OffsetDateTime::class.java)

    override fun recordFailure(scope: AdminLoginThrottleScope, keyHash: String, failedAt: OffsetDateTime) {
        dsl.insertInto(attempts)
            .columns(scopeField, keyHashField, failedAtField)
            .values(scope.name, keyHash, failedAt)
            .execute()
    }

    override fun failureWindow(
        scope: AdminLoginThrottleScope,
        keyHash: String,
        since: OffsetDateTime,
    ): AdminLoginFailureWindow {
        val failureCount = count()
        val oldestFailure = min(failedAtField)
        val record = dsl.select(failureCount, oldestFailure)
            .from(attempts)
            .where(scopeField.eq(scope.name))
            .and(keyHashField.eq(keyHash))
            .and(failedAtField.ge(since))
            .fetchOne() ?: return AdminLoginFailureWindow(0, null)

        return AdminLoginFailureWindow(
            count = record.get(failureCount),
            oldestFailureAt = record.get(oldestFailure),
        )
    }

    override fun clear(scope: AdminLoginThrottleScope, keyHash: String) {
        dsl.deleteFrom(attempts)
            .where(scopeField.eq(scope.name))
            .and(keyHashField.eq(keyHash))
            .execute()
    }

    override fun deleteBefore(cutoff: OffsetDateTime) {
        dsl.deleteFrom(attempts)
            .where(failedAtField.lt(cutoff))
            .execute()
    }
}
