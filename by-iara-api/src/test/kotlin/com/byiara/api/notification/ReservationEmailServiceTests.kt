package com.byiara.api.notification

import com.byiara.api.catalog.domain.Money
import com.byiara.api.notification.application.EmailCopy
import com.byiara.api.notification.application.ReservationEmailService
import com.byiara.api.reservation.domain.Customer
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationStatus
import jakarta.mail.Multipart
import jakarta.mail.Part
import jakarta.mail.Session
import jakarta.mail.internet.MimeMessage
import org.jooq.DSLContext
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.Properties
import java.util.UUID

@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservationEmailServiceTests {
    @Autowired
    private lateinit var reservationEmailService: ReservationEmailService

    @Autowired
    private lateinit var dsl: DSLContext

    // Never hit real SMTP; stubbed per-test to control exactly when sending fails.
    @MockitoBean
    private lateinit var mailSender: JavaMailSender

    private val zone = ZoneId.of("Europe/Brussels")

    @BeforeEach
    fun resetSchema() {
        dsl.execute("drop table if exists email_logs")
        dsl.execute("drop table if exists calendar_feed_tokens")
        dsl.execute("drop table if exists admin_users")
        dsl.execute(
            """
            create table admin_users (
                id uuid default random_uuid() primary key,
                email varchar(255) not null unique,
                password_hash varchar(255) not null,
                role varchar(40) not null,
                active boolean not null default true,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table email_logs (
                id uuid default random_uuid() primary key,
                reservation_id uuid,
                recipient varchar(255) not null,
                email_type varchar(40) not null,
                status varchar(20) not null,
                error_message text,
                created_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute("insert into admin_users (email, password_hash, role, active) values ('admin@by-iara.local', 'x', 'ADMIN', true)")

        // Customer emails now go through MimeMessage (they carry an HTML alternative); a raw
        // mock's createMimeMessage() returns null by default, which would NPE inside
        // MimeMessageHelper, so it needs a real (if unsent) MimeMessage per call.
        val session = Session.getInstance(Properties())
        Mockito.`when`(mailSender.createMimeMessage()).thenAnswer { MimeMessage(session) }
    }

    private fun reservation(status: ReservationStatus, locale: ReservationLocale): Reservation {
        val start = OffsetDateTime.now(zone).plusDays(1)
        return Reservation(
            id = UUID.randomUUID(),
            customer = Customer(id = UUID.randomUUID(), name = "Ana", email = "ana@example.com", phone = null),
            serviceId = UUID.randomUUID(),
            serviceVariantId = UUID.randomUUID(),
            serviceName = "Relaxing massage",
            durationMinutes = 60,
            price = Money(7500, "EUR"),
            startsAt = start,
            endsAt = start.plusHours(1),
            status = status,
            notes = null,
            locale = locale,
        )
    }

    private fun emailLogStatuses(type: String): List<String> =
        dsl.fetch("select status from email_logs where email_type = '$type'").map { it.get("status", String::class.java) }

    @Test
    fun `mail failing every attempt gives up after 3 tries and logs FAILED`() {
        Mockito.doThrow(RuntimeException("smtp down")).`when`(mailSender).send(anyOfType<MimeMessage>())

        reservationEmailService.notifyCustomerOfDecision(reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN))

        Mockito.verify(mailSender, Mockito.times(3)).send(anyOfType<MimeMessage>())
        assertEquals(listOf("FAILED"), emailLogStatuses("RESERVATION_CONFIRMED"))
    }

    @Test
    fun `mail recovering within 3 attempts still logs SENT`() {
        Mockito.doThrow(RuntimeException("smtp down"))
            .doThrow(RuntimeException("smtp down"))
            .doNothing()
            .`when`(mailSender).send(anyOfType<MimeMessage>())

        reservationEmailService.notifyCustomerOfDecision(reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN))

        Mockito.verify(mailSender, Mockito.times(3)).send(anyOfType<MimeMessage>())
        assertEquals(listOf("SENT"), emailLogStatuses("RESERVATION_CONFIRMED"))
    }

    @Test
    fun `admin alert is sent to active admins on new reservation`() {
        reservationEmailService.notifyAdminsOfNewReservation(reservation(ReservationStatus.PENDING, ReservationLocale.EN))

        Mockito.verify(mailSender, Mockito.times(1)).send(anyOfType<MimeMessage>())
        assertEquals(listOf("SENT"), emailLogStatuses("NEW_RESERVATION"))
    }

    @Test
    fun `confirmed and rejected email copy matches booking locale`() {
        val ptConfirmed = EmailCopy.reservationDecision(reservation(ReservationStatus.CONFIRMED, ReservationLocale.PT), zone)
        val enConfirmed = EmailCopy.reservationDecision(reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN), zone)
        val ptRejected = EmailCopy.reservationDecision(reservation(ReservationStatus.REJECTED, ReservationLocale.PT), zone)
        val enRejected = EmailCopy.reservationDecision(reservation(ReservationStatus.REJECTED, ReservationLocale.EN), zone)

        assertTrue(ptConfirmed!!.subject.contains("confirmada"))
        assertTrue(enConfirmed!!.subject.contains("confirmed"))
        assertTrue(ptRejected!!.body.contains("não foi possível"))
        assertTrue(enRejected!!.body.contains("couldn't confirm"))
    }

    @Test
    fun `confirmation tells customers to call about health concerns and includes cancellation terms`() {
        val ptConfirmed = EmailCopy.reservationDecision(
            reservation(ReservationStatus.CONFIRMED, ReservationLocale.PT),
            zone,
            "+351 912 345 678",
        )!!
        val enConfirmed = EmailCopy.reservationDecision(
            reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN),
            zone,
            "+351 912 345 678",
        )!!

        assertTrue(ptConfirmed.body.contains("terá de nos telefonar antes da marcação para +351 912 345 678"))
        assertTrue(ptConfirmed.body.contains("pelo menos 24 horas"))
        assertTrue(ptConfirmed.htmlBody!!.contains("Não envie dados de saúde por email"))
        assertTrue(enConfirmed.body.contains("you must call us before your appointment on +351 912 345 678"))
        assertTrue(enConfirmed.body.contains("repeated late cancellations may require a €15 deposit"))
        assertTrue(enConfirmed.htmlBody!!.contains("Do not send health information by email"))
    }

    @Test
    fun `confirmation includes exact location and links for Google and Apple Maps`() {
        val address = "Rua Vila do Seixal 5, 1.º direito, 2810-141 Almada, Portugal"
        val content = EmailCopy.reservationDecision(
            reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN),
            zone,
            businessAddress = address,
        )!!

        assertTrue(content.body.contains("Location: $address"))
        assertTrue(content.body.contains("https://www.google.com/maps/search/?api=1&query=By+Iara%2C+Rua+Vila"))
        assertTrue(content.body.contains("https://maps.apple.com/?q=By+Iara%2C+Rua+Vila"))
        assertTrue(content.htmlBody!!.contains("1.º direito"))
        assertTrue(content.htmlBody.contains("Google Maps"))
        assertTrue(content.htmlBody.contains("Apple Maps"))
        assertTrue(content.htmlBody.contains("colspan=\"2\""))
        assertTrue(content.htmlBody.contains("text-align:left;\">$address"))
        assertTrue(content.body.contains("email app may show an option to add or accept"))
        assertTrue(content.htmlBody.contains("by-iara-appointment.ics"))
    }

    @Test
    fun `confirmed email carries a portable calendar attachment with the appointment location`() {
        var sentMessage: MimeMessage? = null
        Mockito.doAnswer { invocation ->
            sentMessage = invocation.getArgument(0)
            null
        }.`when`(mailSender).send(anyOfType<MimeMessage>())

        reservationEmailService.notifyCustomerOfDecision(
            reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN),
        )

        requireNotNull(sentMessage).saveChanges()
        val attachment = flattenParts(requireNotNull(sentMessage))
            .first { it.fileName == "by-iara-appointment.ics" }
        val calendar = attachment.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        val unfoldedCalendar = calendar.replace("\r\n ", "")
        assertTrue(attachment.contentType.startsWith("text/calendar"), attachment.contentType)
        assertTrue(calendar.contains("BEGIN:VCALENDAR\r\n"))
        assertTrue(unfoldedCalendar.contains("SUMMARY:Relaxing massage — By Iara"))
        assertTrue(unfoldedCalendar.contains("METHOD:REQUEST"))
        assertTrue(unfoldedCalendar.contains("ORGANIZER:mailto:info@iaragouveia.com"))
        assertTrue(unfoldedCalendar.contains("ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:ana@example.com"))
        assertTrue(
            unfoldedCalendar.contains("LOCATION:Rua Vila do Seixal 5\\, 1.º direito\\,"),
            unfoldedCalendar,
        )
    }

    @Test
    fun `non-decision status produces no customer email`() {
        assertNull(EmailCopy.reservationDecision(reservation(ReservationStatus.PENDING, ReservationLocale.EN), zone))
    }

    @Test
    fun `customer and admin emails all include a branded HTML alternative`() {
        val ptConfirmed = EmailCopy.reservationDecision(reservation(ReservationStatus.CONFIRMED, ReservationLocale.PT), zone)!!
        val enRejected = EmailCopy.reservationDecision(reservation(ReservationStatus.REJECTED, ReservationLocale.EN), zone)!!

        assertTrue(ptConfirmed.htmlBody!!.contains("<html"))
        assertTrue(ptConfirmed.htmlBody.contains("confirmada"))
        assertTrue(ptConfirmed.htmlBody.contains("Relaxing massage"))
        assertTrue(ptConfirmed.htmlBody.contains("cid:logo"))
        assertTrue(enRejected.htmlBody!!.contains("couldn't confirm"))
    }

    @Test
    fun `rejection email includes the customer-facing reason`() {
        val content = EmailCopy.reservationDecision(
            reservation(ReservationStatus.REJECTED, ReservationLocale.EN).copy(
                rejectionMessage = "The requested time is no longer available.",
            ),
            zone,
        )!!

        assertTrue(content.body.contains("Reason: The requested time is no longer available."))
        assertTrue(content.htmlBody!!.contains("The requested time is no longer available."))
    }

    @Test
    fun `cancellation email includes the customer-facing reason`() {
        val content = EmailCopy.reservationDecision(
            reservation(ReservationStatus.CANCELLED, ReservationLocale.EN).copy(
                cancellationMessage = "We need to change our schedule.",
            ),
            zone,
        )!!

        assertTrue(content.subject.contains("cancelled"))
        assertTrue(content.body.contains("Reason: We need to change our schedule."))
        assertTrue(content.htmlBody!!.contains("We need to change our schedule."))
    }

    @Test
    fun `admin alert links straight to the reservation in the admin app`() {
        val target = reservation(ReservationStatus.PENDING, ReservationLocale.EN)
        val adminAlert = EmailCopy.newReservationAlert(target, zone, "http://localhost:4201")
        val expectedUrl = "http://localhost:4201/reservations/${target.id}"

        assertTrue(adminAlert.htmlBody!!.contains("cid:logo"))
        assertTrue(adminAlert.htmlBody.contains(expectedUrl))
        assertTrue(adminAlert.body.contains(expectedUrl))
    }

    @Test
    fun `admin alert HTML escapes untrusted customer input`() {
        val target = reservation(ReservationStatus.PENDING, ReservationLocale.EN).copy(
            customer = Customer(id = UUID.randomUUID(), name = "<script>alert(1)</script>", email = "x@example.com", phone = null),
            notes = "\"quoted\" & <b>bold</b>",
        )

        val adminAlert = EmailCopy.newReservationAlert(target, zone, "http://localhost:4201")

        assertTrue(adminAlert.htmlBody!!.contains("&lt;script&gt;"))
        assertTrue(!adminAlert.htmlBody.contains("<script>alert"))
        assertTrue(adminAlert.htmlBody.contains("&amp;"))
        assertTrue(adminAlert.htmlBody.contains("&lt;b&gt;bold&lt;/b&gt;"))
    }

    // Mockito's any() returns null under the hood. Any concrete non-null return type here
    // (even a wrapper delegating to this) would make Kotlin inject a null-check at that
    // return statement and throw immediately; only an erased generic type avoids it, so
    // this must be called directly at each use site, inferring T from context.
    @Suppress("UNCHECKED_CAST")
    private fun <T> anyOfType(): T {
        Mockito.any<T>()
        return null as T
    }

    private fun flattenParts(part: Part): List<Part> {
        val content = part.content
        if (content !is Multipart) return listOf(part)
        return (0 until content.count).flatMap { flattenParts(content.getBodyPart(it)) }
    }
}
