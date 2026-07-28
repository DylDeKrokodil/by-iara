package com.byiara.api.reservation.api

import com.byiara.api.reservation.application.ReservationService
import com.byiara.api.reservation.application.ReservationCloseoutService
import com.byiara.api.reservation.application.ReservationPaymentService
import com.byiara.api.reservation.domain.ReservationSort
import com.byiara.api.reservation.domain.ReservationStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.http.HttpStatus
import jakarta.validation.Valid
import java.util.UUID
import java.time.OffsetDateTime
import java.time.LocalDate
import org.springframework.format.annotation.DateTimeFormat

@RestController
@RequestMapping("/api/admin/reservations")
class AdminReservationController(
    private val reservationService: ReservationService,
    private val closeoutService: ReservationCloseoutService,
    private val paymentService: ReservationPaymentService,
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

    @GetMapping("/attention")
    fun attention(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ReservationAttentionPageResponse = reservationService.listAttention(page, size).toResponse()

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

    @GetMapping("/{id}/availability")
    fun rescheduleAvailability(
        @PathVariable id: UUID,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) startDate: LocalDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) endDate: LocalDate,
    ): List<OffsetDateTime> = reservationService.findRescheduleSlots(id, startDate, endDate)

    @PatchMapping("/{id}/reschedule")
    fun reschedule(
        @PathVariable id: UUID,
        @Valid @RequestBody request: RescheduleReservationRequest,
    ): ReservationResponse = reservationService.reschedule(id, request.startsAt!!).toResponse()

    @PatchMapping("/{id}/complete")
    fun complete(
        @PathVariable id: UUID,
        @Valid @RequestBody(required = false) request: CompleteReservationRequest?,
    ): ReservationResponse = closeoutService.complete(
        id,
        request?.payment?.toCommand(),
        request?.discount?.toCommand(),
    ).toResponse()

    @PatchMapping("/{id}/no-show")
    fun markNoShow(@PathVariable id: UUID): ReservationResponse =
        closeoutService.markNoShow(id).toResponse()

    @GetMapping("/{id}/payments")
    fun payments(@PathVariable id: UUID): ReservationPaymentsResponse =
        paymentService.getForReservation(id).toResponse()

    @PostMapping("/{id}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    fun recordPayment(
        @PathVariable id: UUID,
        @Valid @RequestBody request: RecordPaymentRequest,
    ): ReservationPaymentResponse = paymentService.record(id, request.toCommand()).toResponse()
}
