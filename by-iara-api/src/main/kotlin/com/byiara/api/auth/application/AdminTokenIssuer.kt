package com.byiara.api.auth.application

import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.domain.AdminAccessToken
import com.byiara.api.auth.domain.AdminIdentity
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class AdminTokenIssuer(
    private val jwtEncoder: JwtEncoder,
    private val properties: AdminAuthProperties,
) {
    fun issue(admin: AdminIdentity): AdminAccessToken {
        val issuedAt = Instant.now()
        val expiresAt = issuedAt.plusSeconds(properties.tokenTtlSeconds)
        val headers = JwsHeader.with(MacAlgorithm.HS256).build()
        val claims = JwtClaimsSet.builder()
            .issuer(properties.jwtIssuer)
            .subject(admin.email)
            .issuedAt(issuedAt)
            .expiresAt(expiresAt)
            .claim("email", admin.email)
            .claim("role", admin.role.name)
            .build()

        val token = jwtEncoder.encode(
            JwtEncoderParameters.from(headers, claims),
        )

        return AdminAccessToken(value = token.tokenValue)
    }
}
