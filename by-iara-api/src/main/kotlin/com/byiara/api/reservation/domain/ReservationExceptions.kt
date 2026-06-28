package com.byiara.api.reservation.domain

import java.util.UUID

class ReservationNotFoundException(id: UUID) :
    RuntimeException("Reservation $id was not found")

/** The requested slot is outside working hours, in the past, or blocked. */
class SlotNotAvailableException(message: String = "The requested time slot is not available") :
    RuntimeException(message)

/** Another active reservation already overlaps the requested slot. */
class SlotAlreadyBookedException(message: String = "The requested time slot is already booked") :
    RuntimeException(message)

class InvalidReservationRequestException(message: String) :
    RuntimeException(message)

class IllegalReservationTransitionException(from: ReservationStatus, to: ReservationStatus) :
    RuntimeException("Cannot change reservation status from $from to $to")
