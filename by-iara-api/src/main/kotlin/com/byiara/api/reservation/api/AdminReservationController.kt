package com.byiara.api.reservation.api

import com.byiara.api.reservation.application.ReservationService
import com.byiara.api.reservation.domain.ReservationStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/admin/reservations")
class AdminReservationController(
    private val reservationService: ReservationService,
) {
    @GetMapping
    fun list(
        @RequestParam(required = false) status: ReservationStatus?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ReservationPageResponse =
        reservationService.list(status, page, size).toResponse()

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): ReservationResponse =
        reservationService.get(id).toResponse()

    @PatchMapping("/{id}/confirm")
    fun confirm(@PathVariable id: UUID): ReservationResponse =
        reservationService.confirm(id).toResponse()

    @PatchMapping("/{id}/reject")
    fun reject(@PathVariable id: UUID): ReservationResponse =
        reservationService.reject(id).toResponse()
}
