package com.byiara.api.calendar

import com.byiara.api.calendar.application.ReservationIcsBuilder
import com.byiara.api.catalog.domain.Money
import com.byiara.api.reservation.domain.Customer
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.OffsetDateTime
import java.util.UUID

class ReservationIcsBuilderTests {
    private val generatedAt = OffsetDateTime.parse("2026-07-12T08:00:00Z")

    private fun reservation(
        status: ReservationStatus = ReservationStatus.CONFIRMED,
        serviceName: String = "Relaxing massage",
        startsAt: OffsetDateTime = OffsetDateTime.parse("2026-07-12T09:00:00+02:00"),
    ): Reservation =
        Reservation(
            id = UUID.fromString("11111111-1111-1111-1111-111111111111"),
            customer = Customer(id = UUID.randomUUID(), name = "Ana", email = "ana@example.com", phone = null),
            serviceId = UUID.randomUUID(),
            serviceVariantId = UUID.randomUUID(),
            serviceName = serviceName,
            durationMinutes = 60,
            price = Money(7500, "EUR"),
            startsAt = startsAt,
            endsAt = startsAt.plusHours(1),
            status = status,
            notes = "customer notes that must never appear in the feed",
            locale = ReservationLocale.EN,
        )

    /** Undoes RFC 5545 line folding: a fold is always CRLF + exactly one space, never a natural line break. */
    private fun unfold(ics: String): List<String> = ics.replace("\r\n ", "").trimEnd('\r', '\n').split("\r\n")

    @Test
    fun `every line ends with CRLF, never a bare LF`() {
        val ics = ReservationIcsBuilder.build(listOf(reservation()), generatedAt)

        assertTrue(ics.contains("\r\n"))
        assertFalse(ics.replace("\r\n", "").contains("\n"))
    }

    @Test
    fun `wraps events in a VCALENDAR with one VEVENT per reservation`() {
        val ics = ReservationIcsBuilder.build(
            listOf(
                reservation(status = ReservationStatus.PENDING),
                reservation(status = ReservationStatus.CONFIRMED),
            ),
            generatedAt,
        )
        val lines = unfold(ics)

        assertEquals("BEGIN:VCALENDAR", lines.first())
        assertEquals("END:VCALENDAR", lines.last())
        assertEquals(2, lines.count { it == "BEGIN:VEVENT" })
        assertEquals(2, lines.count { it == "END:VEVENT" })
    }

    @Test
    fun `pending reservations are tentative and confirmed ones are confirmed`() {
        val ics = ReservationIcsBuilder.build(
            listOf(
                reservation(status = ReservationStatus.PENDING, serviceName = "Haircut"),
                reservation(status = ReservationStatus.CONFIRMED, serviceName = "Manicure"),
            ),
            generatedAt,
        )
        val lines = unfold(ics)

        assertTrue(lines.contains("SUMMARY:Haircut (Pending)"))
        assertTrue(lines.contains("STATUS:TENTATIVE"))
        assertTrue(lines.contains("SUMMARY:Manicure"))
        assertTrue(lines.contains("STATUS:CONFIRMED"))
    }

    @Test
    fun `never includes customer name, phone, or notes`() {
        val ics = ReservationIcsBuilder.build(listOf(reservation()), generatedAt)

        assertFalse(ics.contains("Ana"))
        assertFalse(ics.contains("ana@example.com"))
        assertFalse(ics.contains("customer notes"))
    }

    @Test
    fun `start and end times are converted to UTC regardless of the original offset`() {
        val ics = ReservationIcsBuilder.build(
            listOf(reservation(startsAt = OffsetDateTime.parse("2026-07-12T09:00:00+02:00"))),
            generatedAt,
        )
        val lines = unfold(ics)

        assertTrue(lines.contains("DTSTART:20260712T070000Z"))
        assertTrue(lines.contains("DTEND:20260712T080000Z"))
        assertTrue(lines.contains("DTSTAMP:20260712T080000Z"))
        assertTrue(lines.contains("UID:11111111-1111-1111-1111-111111111111@by-iara.app"))
    }

    @Test
    fun `customer appointment includes the business location and branded summary`() {
        val ics = ReservationIcsBuilder.buildAppointment(
            reservation(),
            generatedAt,
            "Rua Vila do Seixal 5, 1.º direito, 2810-141 Almada, Portugal",
        )
        val lines = unfold(ics)

        assertTrue(lines.contains("X-WR-CALNAME:Iara Gouveia appointment"))
        assertTrue(lines.contains("METHOD:REQUEST"))
        assertTrue(lines.contains("SUMMARY:Relaxing massage — Iara Gouveia"))
        assertTrue(lines.contains("LOCATION:Rua Vila do Seixal 5\\, 1.º direito\\, 2810-141 Almada\\, Portugal"))
        assertTrue(lines.contains("STATUS:CONFIRMED"))
        assertTrue(lines.contains("ORGANIZER:mailto:info@iaragouveia.com"))
        assertTrue(lines.contains("ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:ana@example.com"))
    }

    @Test
    fun `escapes commas, semicolons, backslashes, and embedded newlines in the summary`() {
        val name = "Foo, Bar; Baz\\Qux\nNext line"
        val ics = ReservationIcsBuilder.build(listOf(reservation(serviceName = name)), generatedAt)

        assertTrue(ics.contains("Foo\\, Bar"))
        assertTrue(ics.contains("Bar\\; Baz"))
        assertTrue(ics.contains("Baz\\\\Qux"))
        assertTrue(ics.contains("Qux\\nNext"))
    }

    @Test
    fun `folds a line at exactly 75 octets without losing content`() {
        val name = "A".repeat(100)
        val ics = ReservationIcsBuilder.build(listOf(reservation(serviceName = name)), generatedAt)

        val physicalLines = ics.split("\r\n")
        val summaryLineIndex = physicalLines.indexOfFirst { it.startsWith("SUMMARY:") }
        val firstPhysicalLine = physicalLines[summaryLineIndex]
        val continuationLine = physicalLines[summaryLineIndex + 1]

        assertEquals(75, firstPhysicalLine.toByteArray(Charsets.UTF_8).size)
        assertTrue(continuationLine.startsWith(" "))
        assertTrue(unfold(ics).contains("SUMMARY:$name"))
    }

    @Test
    fun `never splits a multibyte UTF-8 character across a fold boundary`() {
        // "SUMMARY:" (8 octets) + 66 ASCII bytes puts the next character's first byte at
        // octet index 74 - exactly where a naive (non-UTF-8-aware) 75-octet cut would land
        // mid-character, since 'e-acute' is 2 octets in UTF-8.
        val name = "A".repeat(66) + "é" + "A".repeat(40)
        val ics = ReservationIcsBuilder.build(listOf(reservation(serviceName = name)), generatedAt)

        val unfoldedLines = unfold(ics)
        assertTrue(unfoldedLines.contains("SUMMARY:$name"))
        assertFalse(ics.contains("�"))
    }

    @Test
    fun `empty reservation list still produces a valid calendar with no events`() {
        val ics = ReservationIcsBuilder.build(emptyList(), generatedAt)
        val lines = unfold(ics)

        assertEquals("BEGIN:VCALENDAR", lines.first())
        assertEquals("END:VCALENDAR", lines.last())
        assertFalse(lines.contains("BEGIN:VEVENT"))
    }
}
