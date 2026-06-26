package com.byiara.api.auth.application

import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.domain.AdminIdentity
import com.byiara.api.auth.domain.AdminLoginCommand
import com.byiara.api.auth.domain.AdminLoginResult
import com.byiara.api.auth.domain.AdminRole
import com.byiara.api.auth.domain.InvalidCredentialsException
import org.springframework.stereotype.Service

@Service
class AdminAuthService(
    private val properties: AdminAuthProperties,
    private val adminTokenIssuer: AdminTokenIssuer,
) {
    fun login(command: AdminLoginCommand): AdminLoginResult {
        if (command.username != properties.admin.username || command.password != properties.admin.password) {
            throw InvalidCredentialsException()
        }

        val admin = AdminIdentity(
            username = properties.admin.username,
            role = AdminRole.ADMIN,
        )

        return AdminLoginResult(
            accessToken = adminTokenIssuer.issue(admin),
            expiresInSeconds = properties.tokenTtlSeconds,
            admin = admin,
        )
    }
}
