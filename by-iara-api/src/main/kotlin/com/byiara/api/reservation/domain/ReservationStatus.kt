package com.byiara.api.reservation.domain

enum class ReservationStatus {
    PENDING,
    CONFIRMED,
    REJECTED,
    CANCELLED,
    COMPLETED,
    ;

    fun canTransitionTo(target: ReservationStatus): Boolean =
        target in allowedTransitions

    private val allowedTransitions: Set<ReservationStatus>
        get() = when (this) {
            PENDING -> setOf(CONFIRMED, REJECTED, CANCELLED)
            CONFIRMED -> setOf(CANCELLED, COMPLETED)
            REJECTED, CANCELLED, COMPLETED -> emptySet()
        }
}
