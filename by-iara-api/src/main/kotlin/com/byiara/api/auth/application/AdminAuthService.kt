package com.byiara.api.auth.application

import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.domain.AdminCredentialsRepository
import com.byiara.api.auth.domain.AdminLoginCommand
import com.byiara.api.auth.domain.AdminLoginResult
import com.byiara.api.auth.domain.InvalidCredentialsException
import org.springframework.stereotype.Service

@Service
class AdminAuthService(
    private val properties: AdminAuthProperties,
    private val adminTokenIssuer: AdminTokenIssuer,
    private val adminCredentialsRepository: AdminCredentialsRepository,
    private val passwordVerifier: PasswordVerifier,
) {
    fun login(command: AdminLoginCommand): AdminLoginResult {
        val credentials = adminCredentialsRepository.findActiveCredentialsByEmail(command.email)
            ?: throw InvalidCredentialsException()

        if (!passwordVerifier.matches(command.password, credentials.passwordHash)) {
            throw InvalidCredentialsException()
        }

        return AdminLoginResult(
            accessToken = adminTokenIssuer.issue(credentials.identity),
            expiresInSeconds = properties.tokenTtlSeconds,
            admin = credentials.identity,
        )
    }
}
