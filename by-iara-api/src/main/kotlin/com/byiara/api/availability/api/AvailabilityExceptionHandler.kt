package com.byiara.api.availability.api

import com.byiara.api.availability.domain.*
import com.byiara.api.common.api.ApiErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class AvailabilityExceptionHandler {
    @ExceptionHandler(AvailabilityRuleNotFoundException::class)
    fun handleRuleNotFound(exception: AvailabilityRuleNotFoundException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(message = exception.message ?: "Availability rule not found"),
        )

    @ExceptionHandler(AvailabilityBlockNotFoundException::class)
    fun handleBlockNotFound(exception: AvailabilityBlockNotFoundException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(message = exception.message ?: "Availability block not found"),
        )

    @ExceptionHandler(InvalidAvailabilityRuleException::class)
    fun handleInvalidRule(exception: InvalidAvailabilityRuleException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = exception.message ?: "Invalid availability rule"),
        )

    @ExceptionHandler(InvalidAvailabilityBlockException::class)
    fun handleInvalidBlock(exception: InvalidAvailabilityBlockException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = exception.message ?: "Invalid availability block"),
        )

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = exception.message ?: "Invalid argument"),
        )
}
