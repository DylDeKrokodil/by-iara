package com.byiara.api.auth.api

import com.byiara.api.auth.domain.AdminAccountInactiveException
import com.byiara.api.auth.domain.InvalidCredentialsException
import com.byiara.api.auth.domain.InvalidRefreshTokenException
import com.byiara.api.auth.domain.LoginRateLimitExceededException
import com.byiara.api.common.api.ApiErrorResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class AuthExceptionHandler {
    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(exception: InvalidCredentialsException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(message = exception.message ?: "Invalid email or password"),
        )

    @ExceptionHandler(InvalidRefreshTokenException::class)
    fun handleInvalidRefreshToken(exception: InvalidRefreshTokenException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(message = exception.message ?: "Invalid or expired refresh token"),
        )

    @ExceptionHandler(AdminAccountInactiveException::class)
    fun handleAdminAccountInactive(exception: AdminAccountInactiveException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(message = exception.message ?: "Admin account is no longer active"),
        )

    @ExceptionHandler(LoginRateLimitExceededException::class)
    fun handleLoginRateLimitExceeded(exception: LoginRateLimitExceededException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, exception.retryAfterSeconds.toString())
            .body(ApiErrorResponse(message = exception.message ?: "Too many login attempts. Try again later"))
}
