package com.byiara.api.reservation.application

import com.byiara.api.reservation.domain.IllegalReservationTransitionException
import com.byiara.api.reservation.domain.InvalidReservationRequestException
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationNotFoundException
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.ReservationStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID

@Service
class ReservationCloseoutService(
    private val reservationRepository: ReservationRepository,
    private val paymentService: ReservationPaymentService,
) {
    @Transactional
    fun complete(id: UUID, payment: RecordReservationPaymentCommand?): Reservation {
        val reservation = requireConfirmed(id, ReservationStatus.COMPLETED)
        if (reservation.endsAt.isAfter(OffsetDateTime.now())) {
            throw InvalidReservationRequestException("A reservation cannot be completed before its end time")
        }
        transition(id, ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED)
        if (payment != null) {
            paymentService.record(id, payment)
        }
        return reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
    }

    @Transactional
    fun markNoShow(id: UUID): Reservation {
        val reservation = requireConfirmed(id, ReservationStatus.NO_SHOW)
        if (reservation.startsAt.isAfter(OffsetDateTime.now())) {
            throw InvalidReservationRequestException("A reservation cannot be marked as no-show before its start time")
        }
        transition(id, ReservationStatus.CONFIRMED, ReservationStatus.NO_SHOW)
        return reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
    }

    private fun requireConfirmed(id: UUID, target: ReservationStatus): Reservation {
        val reservation = reservationRepository.findById(id) ?: throw ReservationNotFoundException(id)
        if (!reservation.status.canTransitionTo(target)) {
            throw IllegalReservationTransitionException(reservation.status, target)
        }
        return reservation
    }

    private fun transition(id: UUID, from: ReservationStatus, to: ReservationStatus) {
        if (!reservationRepository.transitionStatus(id, from, to)) {
            val current = reservationRepository.findById(id)?.status ?: throw ReservationNotFoundException(id)
            throw IllegalReservationTransitionException(current, to)
        }
    }
}
