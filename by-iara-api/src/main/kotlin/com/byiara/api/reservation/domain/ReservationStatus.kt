package com.byiara.api.reservation.domain

enum class ReservationStatus {
    PENDING,
    CONFIRMED,
    REJECTED,
    CANCELLED,
    COMPLETED,
    NO_SHOW,
    ;

    fun canTransitionTo(target: ReservationStatus): Boolean =
        target in allowedTransitions

    private val allowedTransitions: Set<ReservationStatus>
        get() = when (this) {
            PENDING -> setOf(CONFIRMED, REJECTED, CANCELLED)
            CONFIRMED -> setOf(CANCELLED, COMPLETED, NO_SHOW)
            REJECTED, CANCELLED, COMPLETED, NO_SHOW -> emptySet()
        }
}
