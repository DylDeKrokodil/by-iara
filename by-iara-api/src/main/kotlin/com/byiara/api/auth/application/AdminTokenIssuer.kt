package com.byiara.api.auth.application

import com.byiara.api.auth.domain.AdminAccessToken
import com.byiara.api.auth.domain.AdminIdentity
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64

@Component
class AdminTokenIssuer {
    private val secureRandom = SecureRandom()

    fun issue(admin: AdminIdentity): AdminAccessToken {
        val nonce = ByteArray(32).also { secureRandom.nextBytes(it) }
        val tokenPayload = "${admin.username}:${Instant.now().epochSecond}:${encode(nonce)}"
        return AdminAccessToken(
            value = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(tokenPayload.toByteArray(StandardCharsets.UTF_8)),
        )
    }

    private fun encode(value: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(value)
}
