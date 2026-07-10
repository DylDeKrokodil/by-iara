package com.byiara.api.notification

import com.byiara.api.catalog.domain.Money
import com.byiara.api.notification.application.EmailCopy
import com.byiara.api.notification.application.ReservationEmailService
import com.byiara.api.reservation.domain.Customer
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationStatus
import org.jooq.DSLContext
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.UUID

@SpringBootTest
@ActiveProfiles("test")
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
        Mockito.doThrow(RuntimeException("smtp down")).`when`(mailSender).send(anyOfType<SimpleMailMessage>())

        reservationEmailService.notifyCustomerOfDecision(reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN))

        Mockito.verify(mailSender, Mockito.times(3)).send(anyOfType<SimpleMailMessage>())
        assertEquals(listOf("FAILED"), emailLogStatuses("RESERVATION_CONFIRMED"))
    }

    @Test
    fun `mail recovering within 3 attempts still logs SENT`() {
        Mockito.doThrow(RuntimeException("smtp down"))
            .doThrow(RuntimeException("smtp down"))
            .doNothing()
            .`when`(mailSender).send(anyOfType<SimpleMailMessage>())

        reservationEmailService.notifyCustomerOfDecision(reservation(ReservationStatus.CONFIRMED, ReservationLocale.EN))

        Mockito.verify(mailSender, Mockito.times(3)).send(anyOfType<SimpleMailMessage>())
        assertEquals(listOf("SENT"), emailLogStatuses("RESERVATION_CONFIRMED"))
    }

    @Test
    fun `admin alert is sent to active admins on new reservation`() {
        reservationEmailService.notifyAdminsOfNewReservation(reservation(ReservationStatus.PENDING, ReservationLocale.EN))

        Mockito.verify(mailSender, Mockito.times(1)).send(anyOfType<SimpleMailMessage>())
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
    fun `non-decision status produces no customer email`() {
        assertNull(EmailCopy.reservationDecision(reservation(ReservationStatus.PENDING, ReservationLocale.EN), zone))
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
}
