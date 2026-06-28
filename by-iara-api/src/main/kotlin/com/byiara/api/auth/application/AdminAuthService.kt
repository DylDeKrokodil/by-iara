package com.byiara.api.auth.application

import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.domain.AdminCredentialsRepository
import com.byiara.api.auth.domain.AdminIdentity
import com.byiara.api.auth.domain.AdminLoginCommand
import com.byiara.api.auth.domain.AdminLoginResult
import com.byiara.api.auth.domain.InvalidCredentialsException
import com.byiara.api.auth.domain.InvalidRefreshTokenException
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class AdminAuthService(
    private val properties: AdminAuthProperties,
    private val adminTokenIssuer: AdminTokenIssuer,
    private val adminCredentialsRepository: AdminCredentialsRepository,
    private val refreshTokenService: RefreshTokenService,
    private val passwordVerifier: PasswordVerifier,
) {
    fun login(command: AdminLoginCommand): AdminLoginResult {
        val credentials = adminCredentialsRepository.findActiveCredentialsByEmail(command.email)
            ?: throw InvalidCredentialsException()

        if (!passwordVerifier.matches(command.password, credentials.passwordHash)) {
            throw InvalidCredentialsException()
        }

        return issueSession(credentials.id, credentials.identity)
    }

    fun refresh(rawRefreshToken: String): AdminLoginResult {
        val adminUserId = refreshTokenService.rotate(rawRefreshToken)
        val identity = adminCredentialsRepository.findActiveIdentityById(adminUserId)
            ?: throw InvalidRefreshTokenException()

        return issueSession(adminUserId, identity)
    }

    fun logout(rawRefreshToken: String) {
        refreshTokenService.revoke(rawRefreshToken)
    }

    private fun issueSession(adminUserId: UUID, identity: AdminIdentity): AdminLoginResult =
        AdminLoginResult(
            accessToken = adminTokenIssuer.issue(identity),
            refreshToken = refreshTokenService.issue(adminUserId),
            expiresInSeconds = properties.tokenTtlSeconds,
            admin = identity,
        )
}
