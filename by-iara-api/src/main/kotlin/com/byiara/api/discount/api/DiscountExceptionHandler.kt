package com.byiara.api.discount.api

import com.byiara.api.common.api.ApiErrorResponse
import com.byiara.api.discount.domain.DiscountNotFoundException
import com.byiara.api.discount.domain.InvalidDiscountException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class DiscountExceptionHandler {
    @ExceptionHandler(DiscountNotFoundException::class)
    fun notFound(exception: DiscountNotFoundException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse(exception.message!!))

    @ExceptionHandler(InvalidDiscountException::class)
    fun invalid(exception: InvalidDiscountException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiErrorResponse(exception.message!!))
}
