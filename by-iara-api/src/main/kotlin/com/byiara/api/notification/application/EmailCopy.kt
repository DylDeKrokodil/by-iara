package com.byiara.api.notification.application

import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationStatus
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/** htmlBody is null only where an email has no HTML version (none currently -- kept for flexibility). */
data class EmailContent(val subject: String, val body: String, val htmlBody: String? = null)

/**
 * Subject/body copy for reservation emails, kept separate from send logic so wording
 * changes don't touch ReservationEmailService. Every email also gets an HTML version
 * matching the website's look, since that's what the recipient actually sees the brand
 * through; the plain-text body remains as the multipart/alternative fallback.
 */
object EmailCopy {
    /** Always English: single internal recipient list, not tied to any customer's locale. */
    fun newReservationAlert(reservation: Reservation, zoneId: ZoneId, adminUrl: String): EmailContent {
        val whenText = formatDateTime(reservation, zoneId, Locale.forLanguageTag("en-US"))
        val reviewUrl = "$adminUrl/reservations/${urlEncode(reservation.id.toString())}"

        val rows = buildList {
            add("Service" to "${escapeHtml(reservation.serviceName)} (${reservation.durationMinutes} min)")
            add("When" to whenText)
            add("Customer" to escapeHtml(reservation.customer.name))
            add("Email" to escapeHtml(reservation.customer.email))
            reservation.customer.phone?.let { add("Phone" to escapeHtml(it)) }
            add("Notes" to escapeHtml(reservation.notes ?: "-"))
        }

        return EmailContent(
            subject = "New booking: ${reservation.serviceName} on $whenText",
            body = """
                A new reservation was just requested.

                Service: ${reservation.serviceName} (${reservation.durationMinutes} min)
                When: $whenText
                Customer: ${reservation.customer.name} <${reservation.customer.email}>${reservation.customer.phone?.let { ", $it" } ?: ""}
                Notes: ${reservation.notes ?: "-"}

                Review it here: $reviewUrl
            """.trimIndent(),
            htmlBody = htmlDocument(
                lang = "en",
                title = "New booking request",
                bodyHtml = """
                    <h1 style="$headingStyle">New booking request</h1>
                    <p style="$paragraphStyle">A new reservation was just requested.</p>
                    ${detailsCard(rows)}
                    ${ctaButton("Review this booking", reviewUrl)}
                """.trimIndent(),
            ),
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
            ReservationStatus.CANCELLED -> cancelled(reservation, whenText)
            else -> null
        }
    }

    private fun cancelled(reservation: Reservation, whenText: String): EmailContent {
        val name = reservation.customer.name
        val message = reservation.cancellationMessage ?: when (reservation.locale) {
            ReservationLocale.PT -> "Infelizmente, foi necessário cancelar a sua reserva."
            ReservationLocale.EN -> "Unfortunately, we had to cancel your booking."
        }
        val rows = listOf("Service" to escapeHtml(reservation.serviceName), "When" to whenText)

        return when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "A sua reserva foi cancelada",
                body = """
                    Olá $name,

                    A sua reserva foi cancelada:

                    Serviço: ${reservation.serviceName}
                    Data: $whenText

                    Motivo: $message

                    Contacte-nos se desejar ajuda a marcar outro horário.
                    By Iara
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "A sua reserva foi cancelada",
                    bodyHtml = """
                        <h1 style="$headingStyle">A sua reserva foi cancelada</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(name)}, infelizmente foi necessário cancelar a sua reserva:</p>
                        ${detailsCard(listOf("Serviço" to rows[0].second, "Data" to rows[1].second))}
                        <p style="$paragraphStyle"><strong>Motivo:</strong><br />${escapeHtml(message)}</p>
                        <p style="$paragraphStyle; margin:0;">Contacte-nos se desejar ajuda a marcar outro horário.</p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "Your booking has been cancelled",
                body = """
                    Hi $name,

                    Your booking has been cancelled:

                    Service: ${reservation.serviceName}
                    When: $whenText

                    Reason: $message

                    Please contact us if you would like help booking another time.
                    By Iara
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "Your booking has been cancelled",
                    bodyHtml = """
                        <h1 style="$headingStyle">Your booking has been cancelled</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(name)}, unfortunately we had to cancel your booking:</p>
                        ${detailsCard(rows)}
                        <p style="$paragraphStyle"><strong>Reason:</strong><br />${escapeHtml(message)}</p>
                        <p style="$paragraphStyle; margin:0;">Please contact us if you would like help booking another time.</p>
                    """.trimIndent(),
                ),
            )
        }
    }

    private fun confirmed(reservation: Reservation, whenText: String): EmailContent {
        val name = reservation.customer.name
        val rows = listOf("Service" to escapeHtml(reservation.serviceName), "When" to whenText)
        return when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "A sua reserva foi confirmada",
                body = """
                    Olá $name,

                    A sua reserva está confirmada:

                    Serviço: ${reservation.serviceName}
                    Data: $whenText

                    Até breve!
                    By Iara
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "A sua reserva foi confirmada",
                    bodyHtml = """
                        <h1 style="$headingStyle">A sua reserva foi confirmada</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(name)}, a sua marcação está confirmada &mdash; seguem os detalhes:</p>
                        ${detailsCard(listOf("Serviço" to rows[0].second, "Data" to rows[1].second))}
                        <p style="$paragraphStyle; margin:0;">Até breve!</p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "Your booking is confirmed",
                body = """
                    Hi $name,

                    Your booking is confirmed:

                    Service: ${reservation.serviceName}
                    When: $whenText

                    See you soon!
                    By Iara
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "Your booking is confirmed",
                    bodyHtml = """
                        <h1 style="$headingStyle">Your booking is confirmed</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(name)}, your appointment is set &mdash; here are the details:</p>
                        ${detailsCard(rows)}
                        <p style="$paragraphStyle; margin:0;">See you soon!</p>
                    """.trimIndent(),
                ),
            )
        }
    }

    private fun rejected(reservation: Reservation, whenText: String): EmailContent {
        val name = reservation.customer.name
        val rows = listOf("Service" to escapeHtml(reservation.serviceName), "When" to whenText)
        val rejectionMessage = reservation.rejectionMessage ?: return when (reservation.locale) {
            ReservationLocale.PT -> rejectedWithoutCustomMessage(reservation, whenText)
            ReservationLocale.EN -> rejectedWithoutCustomMessage(reservation, whenText)
        }
        return when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "Não foi possível confirmar a sua reserva",
                body = """
                    Olá $name,

                    Infelizmente não foi possível confirmar o seu pedido de reserva:

                    Serviço: ${reservation.serviceName}
                    Data: $whenText

                    Motivo: $rejectionMessage

                    Por favor visite o site para escolher outro horário.
                    By Iara
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "Não foi possível confirmar a sua reserva",
                    bodyHtml = """
                        <h1 style="$headingStyle">Não foi possível confirmar a sua reserva</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(name)}, infelizmente não foi possível confirmar o seu pedido:</p>
                        ${detailsCard(listOf("Serviço" to rows[0].second, "Data" to rows[1].second))}
                        <p style="$paragraphStyle"><strong>Motivo:</strong><br />${escapeHtml(rejectionMessage)}</p>
                        <p style="$paragraphStyle; margin:0;">Por favor visite o site para escolher outro horário.</p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "We couldn't confirm your booking",
                body = """
                    Hi $name,

                    Unfortunately we couldn't confirm your booking request:

                    Service: ${reservation.serviceName}
                    When: $whenText

                    Reason: $rejectionMessage

                    Please visit the site to pick another time.
                    By Iara
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "We couldn't confirm your booking",
                    bodyHtml = """
                        <h1 style="$headingStyle">We couldn't confirm your booking</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(name)}, unfortunately we couldn't confirm your booking request:</p>
                        ${detailsCard(rows)}
                        <p style="$paragraphStyle"><strong>Reason:</strong><br />${escapeHtml(rejectionMessage)}</p>
                        <p style="$paragraphStyle; margin:0;">Please visit the site to pick another time.</p>
                    """.trimIndent(),
                ),
            )
        }
    }

    /** Compatibility for historic/test reservations that predate persisted rejection messages. */
    private fun rejectedWithoutCustomMessage(reservation: Reservation, whenText: String): EmailContent {
        val fallback = when (reservation.locale) {
            ReservationLocale.PT -> "Não foi possível acomodar este pedido."
            ReservationLocale.EN -> "We were unable to accommodate this request."
        }
        return rejected(reservation.copy(rejectionMessage = fallback), whenText)
    }

    private fun formatDateTime(reservation: Reservation, zoneId: ZoneId, locale: Locale): String {
        val zoned = reservation.startsAt.atZoneSameInstant(zoneId)
        val datePart = zoned.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(locale))
        val timePart = zoned.format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale))
        return "$datePart, $timePart"
    }

    // Shared brand tokens, matching the website's theme.css.
    private const val DISPLAY_FONT = "Georgia, 'Times New Roman', serif"
    private const val BODY_FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    private const val TEXT_PLUM = "#281219"
    private const val TEXT_MUTED = "#87757c"
    private const val SURFACE_TINTED = "#fff3f6"
    private const val BORDER_ROSE = "#f9dce4"
    private const val PAGE_BACKGROUND = "#f8f4f6"
    private const val PRIMARY = "#c04d68"

    private val headingStyle =
        "margin:0 0 16px 0; font-family:$DISPLAY_FONT; font-size:22px; line-height:1.3; font-weight:700; color:$TEXT_PLUM;"
    private val paragraphStyle = "margin:0 0 24px 0; font-size:16px; line-height:1.6; color:$TEXT_PLUM;"

    /**
     * Table-based, inline-styled layout (the email-safe way to do this -- Outlook desktop
     * ignores flexbox/grid and often strips <style> blocks). bodyHtml is the content-specific
     * part (heading, intro, details card, closing/button); this wraps it in the shared
     * logo header and footer chrome every email uses.
     */
    private fun htmlDocument(lang: String, title: String, bodyHtml: String): String = """
        <!DOCTYPE html>
        <html lang="$lang">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(title)}</title>
        </head>
        <body style="margin:0; padding:0; background-color:$PAGE_BACKGROUND; font-family:$BODY_FONT;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:$PAGE_BACKGROUND; padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; border:1px solid #ded4d8;">
                  <tr>
                    <td style="padding:28px 40px; text-align:center; border-bottom:1px solid $BORDER_ROSE;">
                      <img src="cid:logo" width="160" height="77" alt="By Iara" style="display:block; width:160px; max-width:160px; height:auto; margin:0 auto; border:0;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 40px;">
                      $bodyHtml
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 40px; text-align:center; background-color:$PAGE_BACKGROUND; border-radius:0 0 12px 12px;">
                      <span style="font-size:13px; color:$TEXT_MUTED;">By Iara</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
    """.trimIndent()

    /** Label/value rows in a rose-tinted rounded box. Values must already be HTML-escaped by the caller. */
    private fun detailsCard(rows: List<Pair<String, String>>): String {
        val rowsHtml = rows.joinToString("\n") { (label, value) ->
            """
            <tr>
              <td style="padding:4px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:$TEXT_MUTED;">$label</td>
              <td style="padding:4px 0; font-size:15px; font-weight:600; color:$TEXT_PLUM; text-align:right;">$value</td>
            </tr>
            """.trimIndent()
        }
        return """
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:$SURFACE_TINTED; border-radius:8px; margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    $rowsHtml
                  </table>
                </td>
              </tr>
            </table>
        """.trimIndent()
    }

    /** Bulletproof-ish email button: a table cell colored as the background, not CSS on the <a>. */
    private fun ctaButton(label: String, url: String): String = """
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:8px auto 0;">
          <tr>
            <td style="border-radius:8px; background-color:$PRIMARY;">
              <a href="$url" style="display:inline-block; padding:12px 28px; font-family:$BODY_FONT; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">${escapeHtml(label)}</a>
            </td>
          </tr>
        </table>
    """.trimIndent()

    private fun urlEncode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8)

    /** Customer name/email/phone/notes are user-supplied -- never interpolate them into HTML unescaped. */
    private fun escapeHtml(text: String): String = text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}
