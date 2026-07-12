package com.byiara.api.calendar.api

import com.byiara.api.calendar.domain.InvalidCalendarFeedTokenException
import com.byiara.api.common.api.ApiErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class CalendarFeedExceptionHandler {
    @ExceptionHandler(InvalidCalendarFeedTokenException::class)
    fun handleInvalidToken(exception: InvalidCalendarFeedTokenException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(message = exception.message ?: "Invalid or revoked calendar feed token"),
        )
}
