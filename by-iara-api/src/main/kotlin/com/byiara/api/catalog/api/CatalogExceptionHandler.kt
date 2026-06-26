package com.byiara.api.catalog.api

import com.byiara.api.catalog.domain.DuplicateServiceSlugException
import com.byiara.api.catalog.domain.ServiceNotFoundException
import com.byiara.api.common.api.ApiErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class CatalogExceptionHandler {
    @ExceptionHandler(ServiceNotFoundException::class)
    fun handleNotFound(exception: ServiceNotFoundException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(message = exception.message ?: "Service not found"),
        )

    @ExceptionHandler(DuplicateServiceSlugException::class)
    fun handleDuplicateSlug(exception: DuplicateServiceSlugException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiErrorResponse(message = exception.message ?: "Service already exists"),
        )
}
