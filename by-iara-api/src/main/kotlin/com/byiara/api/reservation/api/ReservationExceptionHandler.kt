package com.byiara.api.reservation.api

import com.byiara.api.common.api.ApiErrorResponse
import com.byiara.api.reservation.domain.IllegalReservationTransitionException
import com.byiara.api.reservation.domain.InvalidReservationRequestException
import com.byiara.api.reservation.domain.ReservationNotFoundException
import com.byiara.api.reservation.domain.SlotAlreadyBookedException
import com.byiara.api.reservation.domain.SlotNotAvailableException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ReservationExceptionHandler {
    @ExceptionHandler(ReservationNotFoundException::class)
    fun handleNotFound(exception: ReservationNotFoundException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(message = exception.message ?: "Reservation not found"),
        )

    @ExceptionHandler(InvalidReservationRequestException::class)
    fun handleInvalidRequest(exception: InvalidReservationRequestException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(message = exception.message ?: "Invalid reservation request"),
        )

    @ExceptionHandler(SlotNotAvailableException::class)
    fun handleSlotNotAvailable(exception: SlotNotAvailableException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(
            ApiErrorResponse(message = exception.message ?: "The requested time slot is not available"),
        )

    @ExceptionHandler(SlotAlreadyBookedException::class)
    fun handleSlotAlreadyBooked(exception: SlotAlreadyBookedException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiErrorResponse(message = exception.message ?: "The requested time slot is already booked"),
        )

    @ExceptionHandler(IllegalReservationTransitionException::class)
    fun handleIllegalTransition(exception: IllegalReservationTransitionException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiErrorResponse(message = exception.message ?: "Illegal reservation status change"),
        )
}
