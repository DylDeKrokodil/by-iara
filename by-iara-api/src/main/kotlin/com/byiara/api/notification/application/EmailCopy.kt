package com.byiara.api.notification.application

import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationStatus
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

data class EmailContent(val subject: String, val body: String)

/**
 * Subject/body copy for reservation emails, kept separate from send logic so wording
 * changes don't touch ReservationEmailService. Plain text only -- no templating engine
 * exists in this stack yet, and the MVP doesn't need one.
 */
object EmailCopy {
    /** Always English: single internal recipient list, not tied to any customer's locale. */
    fun newReservationAlert(reservation: Reservation, zoneId: ZoneId): EmailContent {
        val whenText = formatDateTime(reservation, zoneId, Locale.forLanguageTag("en-US"))
        return EmailContent(
            subject = "New booking: ${reservation.serviceName} on $whenText",
            body = """
                A new reservation was just requested.

                Service: ${reservation.serviceName} (${reservation.durationMinutes} min)
                When: $whenText
                Customer: ${reservation.customer.name} <${reservation.customer.email}>${reservation.customer.phone?.let { ", $it" } ?: ""}
                Notes: ${reservation.notes ?: "-"}

                Confirm or reject it from the admin dashboard.
            """.trimIndent(),
        )
    }

    /** Matches the language the customer booked in. Null if the status isn't a customer-facing decision. */
    fun reservationDecision(reservation: Reservation, zoneId: ZoneId): EmailContent? {
        val locale = when (reservation.locale) {
            ReservationLocale.PT -> Locale.forLanguageTag("pt-PT")
            ReservationLocale.EN -> Locale.forLanguageTag("en-US")
        }
        val whenText = formatDateTime(reservation, zoneId, locale)

        return when (reservation.status) {
            ReservationStatus.CONFIRMED -> confirmed(reservation, whenText)
            ReservationStatus.REJECTED -> rejected(reservation, whenText)
            else -> null
        }
    }

    private fun confirmed(reservation: Reservation, whenText: String): EmailContent =
        when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "A sua reserva foi confirmada",
                body = """
                    Olá ${reservation.customer.name},

                    A sua reserva está confirmada:

                    Serviço: ${reservation.serviceName}
                    Data: $whenText

                    Até breve!
                    By Iara
                """.trimIndent(),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "Your booking is confirmed",
                body = """
                    Hi ${reservation.customer.name},

                    Your booking is confirmed:

                    Service: ${reservation.serviceName}
                    When: $whenText

                    See you soon!
                    By Iara
                """.trimIndent(),
            )
        }

    private fun rejected(reservation: Reservation, whenText: String): EmailContent =
        when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "Não foi possível confirmar a sua reserva",
                body = """
                    Olá ${reservation.customer.name},

                    Infelizmente não foi possível confirmar o seu pedido de reserva:

                    Serviço: ${reservation.serviceName}
                    Data: $whenText

                    Por favor visite o site para escolher outro horário.
                    By Iara
                """.trimIndent(),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "We couldn't confirm your booking",
                body = """
                    Hi ${reservation.customer.name},

                    Unfortunately we couldn't confirm your booking request:

                    Service: ${reservation.serviceName}
                    When: $whenText

                    Please visit the site to pick another time.
                    By Iara
                """.trimIndent(),
            )
        }

    private fun formatDateTime(reservation: Reservation, zoneId: ZoneId, locale: Locale): String {
        val zoned = reservation.startsAt.atZoneSameInstant(zoneId)
        val datePart = zoned.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(locale))
        val timePart = zoned.format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale))
        return "$datePart, $timePart"
    }
}
