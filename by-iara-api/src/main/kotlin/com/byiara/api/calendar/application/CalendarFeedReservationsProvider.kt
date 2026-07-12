package com.byiara.api.calendar.application

import com.byiara.api.calendar.config.CalendarFeedProperties
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationListQuery
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.ReservationSort
import com.byiara.api.reservation.domain.ReservationStatus
import org.springframework.stereotype.Component
import java.time.OffsetDateTime

/**
 * Depends on [ReservationRepository] directly rather than the reservation feature's own
 * application-layer service, which clamps page size to 100 - too small to safely represent
 * an unpaged calendar-feed window during a busy stretch.
 */
@Component
class CalendarFeedReservationsProvider(
    private val reservationRepository: ReservationRepository,
    private val properties: CalendarFeedProperties,
) {
    /** Reservations shown on an admin's calendar feed: pending/confirmed only, within a rolling window. */
    fun activeReservations(): List<Reservation> {
        val now = OffsetDateTime.now()
        val query = ReservationListQuery(
            statuses = setOf(ReservationStatus.PENDING, ReservationStatus.CONFIRMED),
            startsFrom = now.minusDays(properties.pastDays),
            startsBefore = now.plusDays(properties.futureDays),
            sort = ReservationSort.STARTS_AT_ASC,
        )
        return reservationRepository.findAll(query, limit = MAX_RESERVATIONS, offset = 0)
    }

    private companion object {
        const val MAX_RESERVATIONS = 2000
    }
}
