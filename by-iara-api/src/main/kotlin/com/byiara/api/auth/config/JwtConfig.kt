package com.byiara.api.auth.config

import com.nimbusds.jose.jwk.source.ImmutableSecret
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

@Configuration
class JwtConfig(
    private val properties: AdminAuthProperties,
) {
    @Bean
    fun jwtEncoder(): JwtEncoder =
        NimbusJwtEncoder(ImmutableSecret(jwtSecretKey()))

    @Bean
    fun jwtDecoder(): JwtDecoder =
        NimbusJwtDecoder
            .withSecretKey(jwtSecretKey())
            .macAlgorithm(MacAlgorithm.HS256)
            .build()

    private fun jwtSecretKey(): SecretKey {
        val secretBytes = properties.jwtSecret.toByteArray(Charsets.UTF_8)
        require(secretBytes.size >= 32) {
            "by-iara.auth.jwt-secret must be at least 32 bytes for HS256"
        }
        return SecretKeySpec(secretBytes, "HmacSHA256")
    }
}
