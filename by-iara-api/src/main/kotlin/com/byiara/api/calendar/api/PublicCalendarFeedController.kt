package com.byiara.api.calendar.api

import com.byiara.api.calendar.application.CalendarFeedReservationsProvider
import com.byiara.api.calendar.application.CalendarFeedTokenService
import com.byiara.api.calendar.application.ReservationIcsBuilder
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime

/**
 * Deliberately outside the admin API namespace: an iPhone/Apple Calendar subscription can't
 * present a JWT, so this endpoint is gated by the opaque token in the path itself (see
 * SecurityConfig's permitAll for this path) rather than by interactive authentication.
 */
@RestController
@RequestMapping("/api/calendar-feed")
class PublicCalendarFeedController(
    private val calendarFeedTokenService: CalendarFeedTokenService,
    private val calendarFeedReservationsProvider: CalendarFeedReservationsProvider,
) {
    @GetMapping("/{token}.ics", produces = ["text/calendar;charset=utf-8"])
    fun fetch(@PathVariable token: String): ResponseEntity<String> {
        calendarFeedTokenService.requireValid(token)
        val ics = ReservationIcsBuilder.build(
            calendarFeedReservationsProvider.activeReservations(),
            OffsetDateTime.now(),
        )
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(ics)
    }
}
