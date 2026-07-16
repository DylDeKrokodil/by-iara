package com.byiara.api.finance.api

import com.byiara.api.common.api.ApiErrorResponse
import com.byiara.api.finance.domain.ExpenseNotFoundException
import com.byiara.api.finance.domain.InvalidFinanceRequestException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class FinanceExceptionHandler {
    @ExceptionHandler(ExpenseNotFoundException::class)
    fun handleNotFound(exception: ExpenseNotFoundException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(message = exception.message ?: "Expense not found"),
        )

    @ExceptionHandler(InvalidFinanceRequestException::class)
    fun handleInvalidRequest(exception: InvalidFinanceRequestException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = exception.message ?: "Invalid finance request"),
        )
}
