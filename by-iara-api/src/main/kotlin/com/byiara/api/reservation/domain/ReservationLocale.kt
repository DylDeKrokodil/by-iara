package com.byiara.api.reservation.domain

enum class ReservationLocale {
    PT,
    EN,
    ;

    companion object {
        fun fromCode(code: String): ReservationLocale =
            entries.firstOrNull { it.name.equals(code, ignoreCase = true) }
                ?: throw IllegalArgumentException("Unsupported locale: $code")
    }
}
