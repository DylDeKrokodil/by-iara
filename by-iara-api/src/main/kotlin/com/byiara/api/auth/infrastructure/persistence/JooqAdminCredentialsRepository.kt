package com.byiara.api.auth.infrastructure.persistence

import com.byiara.api.auth.domain.AdminCredentials
import com.byiara.api.auth.domain.AdminCredentialsRepository
import com.byiara.api.auth.domain.AdminIdentity
import com.byiara.api.auth.domain.AdminRole
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class JooqAdminCredentialsRepository(
    private val dsl: DSLContext,
) : AdminCredentialsRepository {
    override fun findActiveCredentialsByEmail(email: String): AdminCredentials? {
        val adminUsers = table(name("admin_users"))
        val id = field(name("id"), UUID::class.java)
        val emailField = field(name("email"), String::class.java)
        val passwordHash = field(name("password_hash"), String::class.java)
        val role = field(name("role"), String::class.java)
        val active = field(name("active"), Boolean::class.java)

        return dsl
            .select(id, emailField, passwordHash, role)
            .from(adminUsers)
            .where(emailField.equalIgnoreCase(email))
            .and(active.isTrue)
            .limit(1)
            .fetchOne { record ->
                val adminRole = AdminRole.valueOf(record.get(role))
                val adminEmail = record.get(emailField)

                AdminCredentials(
                    id = record.get(id),
                    email = adminEmail,
                    passwordHash = record.get(passwordHash),
                    identity = AdminIdentity(
                        email = adminEmail,
                        role = adminRole,
                    ),
                )
            }
    }
}
