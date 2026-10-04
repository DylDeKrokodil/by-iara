package com.byiara.api.common.api

import com.byiara.api.media.application.InvalidMediaImageException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(InvalidMediaImageException::class)
    fun handleInvalidMediaImage(exception: InvalidMediaImageException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = exception.message ?: "Use a valid JPEG or PNG image")
        )

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleHttpMessageNotReadable(exception: HttpMessageNotReadableException): ResponseEntity<ApiErrorResponse> {
        val rootCause = exception.rootCause
        val message = if (rootCause != null) {
            // Jackson provides detailed enum parse error messages under rootCause
            val rawMessage = rootCause.message ?: ""
            if (rawMessage.contains("not one of the values accepted for Enum class")) {
                val enumValues = rawMessage.substringAfter("[", "").substringBefore("]", "")
                "Invalid value. Accepted values are: [$enumValues]"
            } else {
                rootCause.message ?: exception.message ?: "Malformed JSON request"
            }
        } else {
            exception.message ?: "Malformed JSON request"
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = message)
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleMethodArgumentNotValid(exception: MethodArgumentNotValidException): ResponseEntity<ApiErrorResponse> {
        val fieldErrors = exception.bindingResult.fieldErrors
        val message = fieldErrors.joinToString(", ") { error ->
            "${error.field}: ${error.defaultMessage}"
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = message.ifBlank { "Validation failed" })
        )
    }
}
