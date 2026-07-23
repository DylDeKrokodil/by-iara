package com.byiara.api.common.ratelimit

import com.byiara.api.common.api.ApiErrorResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class PublicRateLimitExceptionHandler {
    @ExceptionHandler(PublicRateLimitExceededException::class)
    fun handle(exception: PublicRateLimitExceededException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, exception.retryAfterSeconds.toString())
            .body(ApiErrorResponse(message = exception.message ?: "Too many requests. Try again later"))
}
