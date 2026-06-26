package com.byiara.api.auth.api

import com.byiara.api.auth.application.AdminAuthService
import com.byiara.api.auth.domain.AdminLoginCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin/auth")
class AdminAuthController(
    private val adminAuthService: AdminAuthService,
) {
    @PostMapping("/login")
    fun login(@Valid @RequestBody request: AdminLoginRequest): AdminLoginResponse {
        val result = adminAuthService.login(request.toCommand())

        return AdminLoginResponse(
            accessToken = result.accessToken.value,
            expiresInSeconds = result.expiresInSeconds,
            admin = AdminIdentityResponse(
                username = result.admin.username,
                role = result.admin.role.name,
            ),
        )
    }
}

data class AdminLoginRequest(
    @field:NotBlank
    val username: String,

    @field:NotBlank
    val password: String,
) {
    fun toCommand(): AdminLoginCommand =
        AdminLoginCommand(username = username, password = password)
}

data class AdminLoginResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresInSeconds: Long,
    val admin: AdminIdentityResponse,
)

data class AdminIdentityResponse(
    val username: String,
    val role: String,
)
