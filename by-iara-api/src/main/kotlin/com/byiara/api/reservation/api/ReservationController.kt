package com.byiara.api.reservation.api

import com.byiara.api.reservation.application.ReservationService
import com.byiara.api.reservation.domain.FindBookableSlotsCommand
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@RestController
@RequestMapping("/api/reservations")
class ReservationController(
    private val reservationService: ReservationService,
) {
    @GetMapping("/availability")
    fun getAvailability(
        @RequestParam serviceId: UUID,
        @RequestParam serviceVariantId: UUID,

        @RequestParam
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        startDate: LocalDate,

        @RequestParam
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        endDate: LocalDate,
    ): List<OffsetDateTime> =
        reservationService.findBookableSlots(
            FindBookableSlotsCommand(
                serviceId = serviceId,
                serviceVariantId = serviceVariantId,
                startDate = startDate,
                endDate = endDate,
            ),
        )

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: CreateReservationRequest): ReservationResponse =
        reservationService.create(request.toCommand()).toResponse()
}
