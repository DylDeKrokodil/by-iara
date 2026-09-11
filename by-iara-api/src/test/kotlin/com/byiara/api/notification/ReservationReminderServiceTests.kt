package com.byiara.api.notification

import com.byiara.api.notification.application.ReservationReminderService
import com.byiara.api.notification.domain.ReservationReminderRepository
import jakarta.mail.Session
import jakarta.mail.internet.MimeMessage
import org.jooq.DSLContext
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Properties
import java.util.UUID

@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservationReminderServiceTests {
    @Autowired
    private lateinit var reminderService: ReservationReminderService

    @Autowired
    private lateinit var reminderRepository: ReservationReminderRepository

    @Autowired
    private lateinit var dsl: DSLContext

    @MockitoBean
    private lateinit var mailSender: JavaMailSender

    private val reservationId = UUID.fromString("11111111-1111-1111-1111-111111111111")
    private val customerId = UUID.fromString("22222222-2222-2222-2222-222222222222")
    private lateinit var now: OffsetDateTime

    @BeforeEach
    fun resetSchema() {
        now = OffsetDateTime.now(ZoneOffset.UTC).withNano(0)
        dsl.execute("drop table if exists reservation_reminders")
        dsl.execute("drop table if exists email_logs")
        dsl.execute("drop table if exists reservations")
        dsl.execute("drop table if exists customers")
        dsl.execute("drop table if exists application_settings")

        dsl.execute(
            """
            create table application_settings (
                setting_key varchar(120) primary key,
                setting_value varchar(500) not null,
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table customers (
                id uuid primary key,
                name varchar(160) not null,
                email varchar(255) not null,
                phone varchar(40)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table reservations (
                id uuid primary key,
                customer_id uuid not null references customers(id),
                service_id uuid,
                service_variant_id uuid,
                service_name varchar(160) not null,
                duration_minutes integer not null,
                price_cents bigint not null,
                currency varchar(3) not null,
                starts_at timestamp with time zone not null,
                ends_at timestamp with time zone not null,
                status varchar(20) not null,
                notes text,
                locale varchar(5) not null,
                rejection_reason_code varchar(40),
                rejection_message varchar(1000),
                decided_at timestamp with time zone,
                cancellation_reason_code varchar(40),
                cancellation_message varchar(1000),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table reservation_reminders (
                reservation_id uuid primary key references reservations(id) on delete cascade,
                reservation_starts_at timestamp with time zone not null,
                status varchar(20) not null,
                attempt_count integer not null,
                next_attempt_at timestamp with time zone not null,
                claimed_at timestamp with time zone,
                sent_at timestamp with time zone,
                last_error text,
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
        dsl.execute("insert into application_settings values ('booking_reminder_enabled', 'true', now())")
        dsl.execute("insert into application_settings values ('booking_reminder_hours_before', '24', now())")
        dsl.execute("insert into customers (id, name, email) values (?, 'Ana', 'ana@example.com')", customerId)

        val startsAt = now.plusHours(12)
        dsl.execute(
            """
            insert into reservations (
                id, customer_id, service_name, duration_minutes, price_cents, currency,
                starts_at, ends_at, status, locale
            ) values (?, ?, 'Relaxing massage', 60, 7500, 'EUR', ?, ?, 'CONFIRMED', 'en')
            """.trimIndent(),
            reservationId,
            customerId,
            startsAt,
            startsAt.plusHours(1),
        )
        reminderRepository.schedule(reservationId, startsAt)

        val session = Session.getInstance(Properties())
        Mockito.reset(mailSender)
        Mockito.`when`(mailSender.createMimeMessage()).thenAnswer { MimeMessage(session) }
    }

    @Test
    fun `due reminder is sent once and recorded`() {
        assertEquals(1, reminderService.dispatchDue(now.plusSeconds(1)))
        assertEquals(0, reminderService.dispatchDue(now.plusMinutes(1)))

        Mockito.verify(mailSender, Mockito.times(1)).send(anyOfType<MimeMessage>())
        assertEquals(
            "SENT",
            dsl.fetchOne(
                "select status from reservation_reminders where reservation_id = ?",
                reservationId,
            )!!.get("status", String::class.java),
        )
        assertEquals(
            1L,
            dsl.fetchValue(
                "select count(*) from email_logs where email_type = 'RESERVATION_REMINDER' and status = 'SENT'",
                Long::class.java,
            ),
        )
    }

    @Test
    fun `disabled reminders leave due deliveries pending`() {
        dsl.execute("update application_settings set setting_value = 'false' where setting_key = 'booking_reminder_enabled'")

        assertEquals(0, reminderService.dispatchDue(now))
        Mockito.verify(mailSender, Mockito.never()).send(anyOfType<MimeMessage>())
        assertEquals(
            "PENDING",
            dsl.fetchOne(
                "select status from reservation_reminders where reservation_id = ?",
                reservationId,
            )!!.get("status", String::class.java),
        )
    }

    @Test
    fun `changing reminder hours immediately changes when a pending reminder is due`() {
        dsl.execute(
            "update application_settings set setting_value = '6' where setting_key = 'booking_reminder_hours_before'",
        )
        assertEquals(0, reminderService.dispatchDue(now.plusSeconds(1)))

        dsl.execute(
            "update application_settings set setting_value = '18' where setting_key = 'booking_reminder_hours_before'",
        )
        assertEquals(1, reminderService.dispatchDue(now.plusSeconds(2)))
        Mockito.verify(mailSender, Mockito.times(1)).send(anyOfType<MimeMessage>())
    }

    @Test
    fun `rescheduling resets delivery for the new appointment time`() {
        val rescheduledStart = now.plusHours(48)
        dsl.execute(
            "update reservations set starts_at = ?, ends_at = ? where id = ?",
            rescheduledStart,
            rescheduledStart.plusHours(1),
            reservationId,
        )
        reminderRepository.schedule(reservationId, rescheduledStart)

        assertEquals(0, reminderService.dispatchDue(now.plusSeconds(1)))
        assertEquals(1, reminderService.dispatchDue(now.plusHours(25)))
        Mockito.verify(mailSender, Mockito.times(1)).send(anyOfType<MimeMessage>())
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> anyOfType(): T {
        Mockito.any<T>()
        return null as T
    }
}
