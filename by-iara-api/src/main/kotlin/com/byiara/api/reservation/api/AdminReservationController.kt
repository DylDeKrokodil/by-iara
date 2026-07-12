package com.byiara.api.reservation.api

import com.byiara.api.reservation.application.ReservationService
import com.byiara.api.reservation.domain.ReservationSort
import com.byiara.api.reservation.domain.ReservationStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestBody
import jakarta.validation.Valid
import java.util.UUID
import java.time.OffsetDateTime

@RestController
@RequestMapping("/api/admin/reservations")
class AdminReservationController(
    private val reservationService: ReservationService,
) {
    @GetMapping
    fun list(
        @RequestParam(required = false) status: Set<ReservationStatus>?,
        @RequestParam(required = false, name = "from") startsFrom: OffsetDateTime?,
        @RequestParam(required = false, name = "to") startsBefore: OffsetDateTime?,
        @RequestParam(required = false) historyBefore: OffsetDateTime?,
        @RequestParam(defaultValue = "STARTS_AT_DESC") sort: ReservationSort,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ReservationPageResponse =
        reservationService.list(
            statuses = status.orEmpty(),
            startsFrom = startsFrom,
            startsBefore = startsBefore,
            historyBefore = historyBefore,
            sort = sort,
            page = page,
            size = size,
        ).toResponse()

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): ReservationResponse =
        reservationService.get(id).toResponse()

    @PatchMapping("/{id}/confirm")
    fun confirm(@PathVariable id: UUID): ReservationResponse =
        reservationService.confirm(id).toResponse()

    @PatchMapping("/{id}/reject")
    fun reject(
        @PathVariable id: UUID,
        @Valid @RequestBody request: RejectReservationRequest,
    ): ReservationResponse =
        reservationService.reject(id, request.reasonCode!!, request.message!!.trim()).toResponse()

    @PatchMapping("/{id}/cancel")
    fun cancel(
        @PathVariable id: UUID,
        @Valid @RequestBody request: CancelReservationRequest,
    ): ReservationResponse =
        reservationService.cancel(id, request.reasonCode!!, request.message!!.trim()).toResponse()
}
