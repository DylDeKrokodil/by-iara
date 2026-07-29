package com.byiara.api.guide.api

import com.byiara.api.common.api.ApiErrorResponse
import com.byiara.api.guide.domain.DuplicateGuideSlugException
import com.byiara.api.guide.domain.GuideNotFoundException
import com.byiara.api.guide.domain.InvalidGuideException
import com.byiara.api.guide.domain.InvalidGuideImageException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GuideExceptionHandler {
    @ExceptionHandler(GuideNotFoundException::class)
    fun notFound(exception: GuideNotFoundException) =
        ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiErrorResponse(message = exception.message ?: "Guide not found"))

    @ExceptionHandler(DuplicateGuideSlugException::class)
    fun duplicateSlug(exception: DuplicateGuideSlugException) =
        ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse(message = exception.message ?: "Guide slug already exists"))

    @ExceptionHandler(InvalidGuideException::class, InvalidGuideImageException::class)
    fun invalid(exception: RuntimeException) =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse(message = exception.message ?: "Invalid guide"))
}
