package com.byiara.api.calendar.application

import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationStatus
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Hand-rolled RFC 5545 (iCalendar) rendering for the small, fixed VEVENT shape this feed needs -
 * no recurrence, no attendees, no alarms. Deliberately avoids a third-party ICS library: Spring
 * Boot 4.1/Kotlin 2.3 are new enough that an unverified transitive dependency is a bigger risk
 * than hand-controlling this narrow surface (the same reasoning behind this codebase's jOOQ usage
 * with zero codegen).
 */
object ReservationIcsBuilder {
    private const val MAX_OCTETS_PER_LINE = 75
    private val UTC_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")

    fun build(reservations: List<Reservation>, generatedAt: OffsetDateTime): String {
        val lines = mutableListOf<String>()
        lines += "BEGIN:VCALENDAR"
        lines += "VERSION:2.0"
        lines += "PRODID:-//by-iara//Reservations Feed//EN"
        lines += "CALSCALE:GREGORIAN"
        lines += "METHOD:PUBLISH"
        lines += "X-WR-CALNAME:by-iara Reservations"
        lines += "REFRESH-INTERVAL;VALUE=DURATION:PT1H"
        reservations.forEach { lines += eventLines(it, generatedAt) }
        lines += "END:VCALENDAR"

        return lines.joinToString(separator = "\r\n", postfix = "\r\n") { foldLine(it) }
    }

    private fun eventLines(reservation: Reservation, generatedAt: OffsetDateTime): List<String> {
        val isPending = reservation.status == ReservationStatus.PENDING
        val summary = if (isPending) "${reservation.serviceName} (Pending)" else reservation.serviceName
        val status = if (isPending) "TENTATIVE" else "CONFIRMED"

        return listOf(
            "BEGIN:VEVENT",
            "UID:${reservation.id}@by-iara.app",
            "DTSTAMP:${formatUtc(generatedAt)}",
            "DTSTART:${formatUtc(reservation.startsAt)}",
            "DTEND:${formatUtc(reservation.endsAt)}",
            "SUMMARY:${escapeText(summary)}",
            "STATUS:$status",
            "END:VEVENT",
        )
    }

    private fun formatUtc(value: OffsetDateTime): String =
        value.withOffsetSameInstant(ZoneOffset.UTC).format(UTC_FORMAT)

    /** RFC 5545 3.3.11 TEXT escaping. Backslash must be escaped first so the later replacements don't double-escape. */
    private fun escapeText(value: String): String {
        val normalized = value.replace("\r\n", "\n").replace("\r", "\n")
        return normalized
            .replace("\\", "\\\\")
            .replace(";", "\\;")
            .replace(",", "\\,")
            .replace("\n", "\\n")
    }

    /**
     * RFC 5545 3.1 line folding: no content line may exceed 75 octets, and a fold must never split
     * a multi-octet UTF-8 character (service names are admin-authored free text, plausibly accented).
     */
    private fun foldLine(line: String): String {
        val bytes = line.toByteArray(Charsets.UTF_8)
        if (bytes.size <= MAX_OCTETS_PER_LINE) return line

        val folded = StringBuilder()
        var start = 0
        var budget = MAX_OCTETS_PER_LINE
        while (start < bytes.size) {
            val end = charBoundaryAtOrBefore(bytes, minOf(start + budget, bytes.size))
            folded.append(String(bytes, start, end - start, Charsets.UTF_8))
            start = end
            if (start < bytes.size) {
                // A single-space continuation prefix counts against that physical line's own budget.
                folded.append("\r\n ")
                budget = MAX_OCTETS_PER_LINE - 1
            }
        }
        return folded.toString()
    }

    /** UTF-8 continuation bytes match the `10xxxxxx` bit pattern; back off until we're not on one. */
    private fun charBoundaryAtOrBefore(bytes: ByteArray, index: Int): Int {
        if (index >= bytes.size) return bytes.size
        var i = index
        while (i > 0 && (bytes[i].toInt() and 0xC0) == 0x80) {
            i--
        }
        return i
    }
}
