package com.byiara.api.customer.api

import com.byiara.api.common.api.ApiErrorResponse
import com.byiara.api.customer.domain.CustomerNotFoundException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class CustomerExceptionHandler {
    @ExceptionHandler(CustomerNotFoundException::class)
    fun notFound(exception: CustomerNotFoundException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiErrorResponse(exception.message!!))
}
