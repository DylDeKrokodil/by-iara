package com.byiara.api.auth.api

import com.byiara.api.auth.application.AdminAuthService
import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.domain.AdminLoginCommand
import com.byiara.api.auth.domain.AdminLoginResult
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.CookieValue
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
    private val properties: AdminAuthProperties,
) {
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: AdminLoginRequest,
        servletRequest: HttpServletRequest,
        servletResponse: HttpServletResponse,
    ): AdminLoginResponse {
        val session = adminAuthService.login(request.toCommand(), servletRequest.remoteAddr)
        setRefreshCookie(servletResponse, session.refreshToken)
        return session.toResponse()
    }

    @PostMapping("/refresh")
    fun refresh(
        @CookieValue(name = ADMIN_REFRESH_COOKIE, required = false) refreshToken: String?,
        servletResponse: HttpServletResponse,
    ): AdminLoginResponse {
        val session = adminAuthService.refresh(refreshToken.orEmpty())
        setRefreshCookie(servletResponse, session.refreshToken)
        return session.toResponse()
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(
        @CookieValue(name = ADMIN_REFRESH_COOKIE, required = false) refreshToken: String?,
        servletResponse: HttpServletResponse,
    ) {
        refreshToken?.takeIf { it.isNotBlank() }?.let(adminAuthService::logout)
        clearRefreshCookie(servletResponse)
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
            expiresInSeconds = expiresInSeconds,
            admin = AdminIdentityResponse(
                email = admin.email,
                role = admin.role.name,
            ),
        )

    private fun setRefreshCookie(response: HttpServletResponse, token: String) {
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            refreshCookie(token, properties.refreshTokenTtlSeconds).toString(),
        )
    }

    private fun clearRefreshCookie(response: HttpServletResponse) {
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", 0).toString())
    }

    private fun refreshCookie(value: String, maxAgeSeconds: Long): ResponseCookie =
        ResponseCookie.from(ADMIN_REFRESH_COOKIE, value)
            .httpOnly(true)
            .secure(properties.refreshCookieSecure)
            .sameSite("Strict")
            .path("/api/admin/auth")
            .maxAge(maxAgeSeconds)
            .build()
}

const val ADMIN_REFRESH_COOKIE = "byiara_admin_refresh"

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
