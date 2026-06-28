package com.byiara.api.auth.api

import com.byiara.api.auth.application.AdminAuthService
import com.byiara.api.auth.domain.AdminLoginCommand
import com.byiara.api.auth.domain.AdminLoginResult
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin/auth")
class AdminAuthController(
    private val adminAuthService: AdminAuthService,
) {
    @PostMapping("/login")
    fun login(@Valid @RequestBody request: AdminLoginRequest): AdminLoginResponse =
        adminAuthService.login(request.toCommand()).toResponse()

    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody request: RefreshTokenRequest): AdminLoginResponse =
        adminAuthService.refresh(request.refreshToken).toResponse()

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(@Valid @RequestBody request: RefreshTokenRequest) {
        adminAuthService.logout(request.refreshToken)
    }

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal jwt: Jwt): AdminIdentityResponse =
        AdminIdentityResponse(
            email = requireNotNull(jwt.getClaimAsString("email")),
            role = requireNotNull(jwt.getClaimAsString("role")),
        )

    private fun AdminLoginResult.toResponse(): AdminLoginResponse =
        AdminLoginResponse(
            accessToken = accessToken.value,
            refreshToken = refreshToken,
            expiresInSeconds = expiresInSeconds,
            admin = AdminIdentityResponse(
                email = admin.email,
                role = admin.role.name,
            ),
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

data class RefreshTokenRequest(
    @field:NotBlank
    val refreshToken: String,
)

data class AdminLoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresInSeconds: Long,
    val admin: AdminIdentityResponse,
)

data class AdminIdentityResponse(
    val email: String,
    val role: String,
)
