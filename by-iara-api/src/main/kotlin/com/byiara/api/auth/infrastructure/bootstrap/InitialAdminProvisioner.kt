package com.byiara.api.auth.infrastructure.bootstrap

import com.byiara.api.auth.config.InitialAdminProperties
import org.jooq.DSLContext
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
@ConditionalOnProperty(
    prefix = "by-iara.auth.initial-admin",
    name = ["enabled"],
    havingValue = "true",
)
class InitialAdminProvisioner(
    private val properties: InitialAdminProperties,
    private val passwordEncoder: PasswordEncoder,
    private val dsl: DSLContext,
) : ApplicationRunner {
    override fun run(args: ApplicationArguments) {
        val email = properties.email.trim().lowercase()
        require(email.contains('@')) {
            "INITIAL_ADMIN_EMAIL must be a valid email address when initial admin provisioning is enabled"
        }
        require(properties.password.length >= MINIMUM_PASSWORD_LENGTH) {
            "INITIAL_ADMIN_PASSWORD must contain at least $MINIMUM_PASSWORD_LENGTH characters"
        }

        dsl.execute(
            """
            insert into admin_users (email, password_hash, role, active)
            values (?, ?, 'ADMIN', true)
            on conflict (email) do update
            set password_hash = excluded.password_hash,
                active = true,
                updated_at = now()
            """.trimIndent(),
            email,
            passwordEncoder.encode(properties.password),
        )

        logger.info("Initial admin account is active for {}", email)
    }

    private companion object {
        const val MINIMUM_PASSWORD_LENGTH = 12
        val logger = LoggerFactory.getLogger(InitialAdminProvisioner::class.java)
    }
}
