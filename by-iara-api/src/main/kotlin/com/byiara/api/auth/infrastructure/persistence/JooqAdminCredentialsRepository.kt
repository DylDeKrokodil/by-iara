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
    private val adminUsers = table(name("admin_users"))
    private val id = field(name("id"), UUID::class.java)
    private val emailField = field(name("email"), String::class.java)
    private val passwordHash = field(name("password_hash"), String::class.java)
    private val role = field(name("role"), String::class.java)
    private val active = field(name("active"), Boolean::class.java)

    override fun findActiveCredentialsByEmail(email: String): AdminCredentials? =
        dsl
            .select(id, emailField, passwordHash, role)
            .from(adminUsers)
            .where(emailField.equalIgnoreCase(email))
            .and(active.isTrue)
            .limit(1)
            .fetchOne { record ->
                val adminEmail = record.get(emailField)

                AdminCredentials(
                    id = record.get(id),
                    email = adminEmail,
                    passwordHash = record.get(passwordHash),
                    identity = AdminIdentity(
                        email = adminEmail,
                        role = AdminRole.valueOf(record.get(role)),
                    ),
                )
            }

    override fun findActiveIdentityById(id: UUID): AdminIdentity? =
        dsl
            .select(emailField, role)
            .from(adminUsers)
            .where(this.id.eq(id))
            .and(active.isTrue)
            .limit(1)
            .fetchOne { record ->
                AdminIdentity(
                    email = record.get(emailField),
                    role = AdminRole.valueOf(record.get(role)),
                )
            }
}
