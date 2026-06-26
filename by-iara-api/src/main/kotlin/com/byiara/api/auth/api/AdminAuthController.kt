package com.byiara.api.auth.api

import com.byiara.api.auth.application.AdminAuthService
import com.byiara.api.auth.domain.AdminLoginCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
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
                email = result.admin.email,
                role = result.admin.role.name,
            ),
        )
    }

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal jwt: Jwt): AdminIdentityResponse =
        AdminIdentityResponse(
            email = requireNotNull(jwt.getClaimAsString("email")),
            role = requireNotNull(jwt.getClaimAsString("role")),
        )
}

data class AdminLoginRequest(
    @field:NotBlank
    val email: String,

    @field:NotBlank
    val password: String,
) {
    fun toCommand(): AdminLoginCommand =
        AdminLoginCommand(email = email, password = password)
}

data class AdminLoginResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresInSeconds: Long,
    val admin: AdminIdentityResponse,
)

data class AdminIdentityResponse(
    val email: String,
    val role: String,
)
