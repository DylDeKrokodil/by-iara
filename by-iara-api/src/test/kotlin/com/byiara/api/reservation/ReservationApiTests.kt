package com.byiara.api.reservation

import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.jooq.DSLContext
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.MvcResult
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReservationApiTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    // Never hit real SMTP in tests; a void-returning mock no-ops successfully by default.
    @MockitoBean
    private lateinit var mailSender: JavaMailSender

    private val zone = ZoneId.of("Europe/Brussels")
    private val serviceId = "11111111-1111-1111-1111-111111111111"
    private val variantId = "22222222-2222-2222-2222-222222222222"

    // A future weekday slot at 10:00 local, with a 09:00-17:00 rule seeded for that weekday.
    private val slotStart: OffsetDateTime =
        LocalDate.now(zone).plusDays(7).atTime(10, 0).atZone(zone).toOffsetDateTime()

    @BeforeEach
    fun resetSchema() {
        dsl.execute("drop table if exists email_logs")
        dsl.execute("drop table if exists reservations")
        dsl.execute("drop table if exists customers")
        dsl.execute("drop table if exists availability_blocks")
        dsl.execute("drop table if exists availability_rules")
        dsl.execute("drop table if exists service_translations")
        dsl.execute("drop table if exists service_variants")
        dsl.execute("drop table if exists services")
        dsl.execute("drop table if exists admin_users")

        dsl.execute(
            """
            create table services (
                id uuid default random_uuid() primary key,
                slug varchar(140) not null unique,
                name varchar(160) not null,
                description text,
                active boolean not null default true,
                sort_order integer not null default 0,
                featured boolean not null default false,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table service_variants (
                id uuid default random_uuid() primary key,
                service_id uuid not null references services(id) on delete cascade,
                duration_minutes integer not null,
                price_cents bigint not null,
                currency varchar(3) not null default 'EUR',
                active boolean not null default true,
                sort_order integer not null default 0,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table service_translations (
                service_id uuid not null references services(id) on delete cascade,
                locale varchar(10) not null,
                name varchar(160) not null,
                description text,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now(),
                primary key (service_id, locale)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table availability_rules (
                id uuid default random_uuid() primary key,
                day_of_week integer not null,
                start_time time without time zone not null,
                end_time time without time zone not null,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table availability_blocks (
                id uuid default random_uuid() primary key,
                start_time timestamp with time zone not null,
                end_time timestamp with time zone not null,
                reason varchar(255),
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table customers (
                id uuid default random_uuid() primary key,
                name varchar(160) not null,
                email varchar(255) not null unique,
                phone varchar(40),
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table reservations (
                id uuid default random_uuid() primary key,
                customer_id uuid not null references customers(id),
                service_id uuid references services(id) on delete set null,
                service_variant_id uuid references service_variants(id) on delete set null,
                service_name varchar(160) not null,
                duration_minutes integer not null,
                price_cents bigint not null,
                currency varchar(3) not null default 'EUR',
                starts_at timestamp with time zone not null,
                ends_at timestamp with time zone not null,
                status varchar(20) not null default 'PENDING',
                notes text,
                locale varchar(5) not null default 'en',
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
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
        dsl.execute("insert into services (id, slug, name, active) values ('$serviceId', 'relax', 'Relaxing massage', true)")
        dsl.execute(
            "insert into service_variants (id, service_id, duration_minutes, price_cents, currency, active) " +
                "values ('$variantId', '$serviceId', 60, 7500, 'EUR', true)",
        )
        val dayOfWeek = slotStart.atZoneSameInstant(zone).dayOfWeek.value
        dsl.execute("insert into availability_rules (day_of_week, start_time, end_time) values ($dayOfWeek, '09:00:00', '17:00:00')")
    }

    private fun adminJwt(): RequestPostProcessor =
        jwt().jwt { it.claim("email", "admin@by-iara.local").claim("role", "ADMIN") }

    private fun iso(time: OffsetDateTime): String = time.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)

    private fun bookingBody(start: OffsetDateTime, email: String = "ana@example.com"): String =
        """
        {
          "serviceId": "$serviceId",
          "serviceVariantId": "$variantId",
          "startsAt": "${iso(start)}",
          "customer": { "name": "Ana", "email": "$email", "phone": "+351912345678" },
          "notes": "Front desk request"
        }
        """.trimIndent()

    private fun book(start: OffsetDateTime, email: String = "ana@example.com") =
        mockMvc.perform(
            post("/api/reservations").contentType("application/json").content(bookingBody(start, email)),
        )

    @Test
    fun `public booking creates a pending reservation with a price snapshot`() {
        book(slotStart)
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.serviceName").value("Relaxing massage"))
            .andExpect(jsonPath("$.durationMinutes").value(60))
            .andExpect(jsonPath("$.price.amountCents").value(7500))
            .andExpect(jsonPath("$.customer.email").value("ana@example.com"))
    }

    @Test
    fun `booking notifies active admins and logs the attempt`() {
        book(slotStart).andExpect(status().isCreated)

        val logs = dsl.fetch("select recipient, email_type, status from email_logs where email_type = 'NEW_RESERVATION'")
        assertEquals(1, logs.size)
        assertEquals("admin@by-iara.local", logs[0].get("recipient", String::class.java))
        assertEquals("SENT", logs[0].get("status", String::class.java))
    }

    @Test
    fun `booking outside working hours is rejected`() {
        val beforeOpening = slotStart.minusHours(3) // 07:00 local, before the 09:00 rule
        book(beforeOpening)
            .andExpect(status().isUnprocessableEntity())
    }

    @Test
    fun `overlapping booking is rejected`() {
        book(slotStart, email = "first@example.com").andExpect(status().isCreated)

        // Overlaps the 10:00-11:00 booking, still inside working hours.
        book(slotStart.plusMinutes(30), email = "second@example.com")
            .andExpect(status().isConflict)
    }

    @Test
    fun `public bookable availability excludes active reservations`() {
        book(slotStart, email = "first@example.com").andExpect(status().isCreated)

        val bookingDate = slotStart.atZoneSameInstant(zone).toLocalDate().toString()

        mockMvc.perform(
            get("/api/reservations/availability")
                .param("serviceId", serviceId)
                .param("serviceVariantId", variantId)
                .param("startDate", bookingDate)
                .param("endDate", bookingDate),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", not(hasItem(iso(slotStart)))))
            .andExpect(jsonPath("$", hasItem(iso(slotStart.minusHours(1)))))
            .andExpect(jsonPath("$", hasItem(iso(slotStart.plusHours(1)))))
    }

    @Test
    fun `next available returns the earliest open slot today when today is open`() {
        seedWideOpenRuleForToday()

        mockMvc.perform(get("/api/reservations/next-available"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.startsAt").exists())
    }

    @Test
    fun `next available excludes a slot once it is booked`() {
        seedWideOpenRuleForToday()

        val first = nextAvailable()
        book(first, email = "today@example.com").andExpect(status().isCreated)
        val second = nextAvailable()

        assertTrue(second.isAfter(first), "expected $second to be after $first")
    }

    @Test
    fun `next available falls back to a future day when today has no rule`() {
        // resetSchema() seeds a rule for slotStart's weekday, which is 7 days out
        // and therefore today's weekday too. Clear it so today is genuinely closed.
        dsl.execute("delete from availability_rules")

        val today = OffsetDateTime.now(zone)
        val futureDay = today.plusDays(2)
        dsl.execute(
            "insert into availability_rules (day_of_week, start_time, end_time) values (${futureDay.dayOfWeek.value}, '09:00:00', '17:00:00')",
        )

        val next = nextAvailable()

        assertTrue(
            next.atZoneSameInstant(zone).toLocalDate().isAfter(today.atZoneSameInstant(zone).toLocalDate()),
            "expected a future date, got $next",
        )
    }

    @Test
    fun `next available is null when there is no rule in the search window`() {
        dsl.execute("delete from availability_rules")

        mockMvc.perform(get("/api/reservations/next-available"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.startsAt").doesNotExist())
    }

    @Test
    fun `unknown service is rejected`() {
        val body = bookingBody(slotStart).replace(serviceId, "99999999-9999-9999-9999-999999999999")
        mockMvc.perform(post("/api/reservations").contentType("application/json").content(body))
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `admin can confirm a pending reservation`() {
        val id = reservationIdFrom(book(slotStart).andExpect(status().isCreated).andReturn())

        mockMvc.perform(patch("/api/admin/reservations/$id/confirm").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
    }

    @Test
    fun `confirming a reservation notifies the customer and logs the attempt`() {
        val id = reservationIdFrom(book(slotStart, "ana@example.com").andExpect(status().isCreated).andReturn())

        mockMvc.perform(patch("/api/admin/reservations/$id/confirm").with(adminJwt())).andExpect(status().isOk)

        val logs = dsl.fetch("select recipient, status from email_logs where email_type = 'RESERVATION_CONFIRMED'")
        assertEquals(1, logs.size)
        assertEquals("ana@example.com", logs[0].get("recipient", String::class.java))
        assertEquals("SENT", logs[0].get("status", String::class.java))
    }

    @Test
    fun `rejecting a reservation notifies the customer and logs the attempt`() {
        val id = reservationIdFrom(book(slotStart, "ana@example.com").andExpect(status().isCreated).andReturn())

        mockMvc.perform(patch("/api/admin/reservations/$id/reject").with(adminJwt())).andExpect(status().isOk)

        val logs = dsl.fetch("select recipient, status from email_logs where email_type = 'RESERVATION_REJECTED'")
        assertEquals(1, logs.size)
        assertEquals("ana@example.com", logs[0].get("recipient", String::class.java))
        assertEquals("SENT", logs[0].get("status", String::class.java))
    }

    @Test
    fun `confirming an already confirmed reservation is rejected`() {
        val id = reservationIdFrom(book(slotStart).andExpect(status().isCreated).andReturn())

        mockMvc.perform(patch("/api/admin/reservations/$id/confirm").with(adminJwt())).andExpect(status().isOk)
        mockMvc.perform(patch("/api/admin/reservations/$id/confirm").with(adminJwt()))
            .andExpect(status().isConflict)
    }

    @Test
    fun `admin can list upcoming confirmed reservations from a date sorted by start time`() {
        val laterId = reservationIdFrom(book(slotStart.plusHours(2), "later@example.com").andExpect(status().isCreated).andReturn())
        val soonerId = reservationIdFrom(book(slotStart, "sooner@example.com").andExpect(status().isCreated).andReturn())

        mockMvc.perform(patch("/api/admin/reservations/$laterId/confirm").with(adminJwt())).andExpect(status().isOk)
        mockMvc.perform(patch("/api/admin/reservations/$soonerId/confirm").with(adminJwt())).andExpect(status().isOk)

        mockMvc.perform(
            get("/api/admin/reservations")
                .with(adminJwt())
                .param("status", "CONFIRMED")
                .param("from", iso(slotStart.minusMinutes(1)))
                .param("sort", "STARTS_AT_ASC")
                .param("page", "0")
                .param("size", "10"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items[0].id").value(soonerId))
            .andExpect(jsonPath("$.items[1].id").value(laterId))
    }

    @Test
    fun `admin can list confirmed reservations inside a half open date range`() {
        val rangeStart = slotStart.minusDays(1)
        val rangeEnd = slotStart.plusDays(1)
        val beforeRangeId = insertReservation(
            start = rangeStart.minusHours(1),
            status = "CONFIRMED",
            email = "before-range@example.com",
        )
        val insideRangeId = insertReservation(
            start = slotStart,
            status = "CONFIRMED",
            email = "inside-range@example.com",
        )
        val atRangeEndId = insertReservation(
            start = rangeEnd,
            status = "CONFIRMED",
            email = "at-range-end@example.com",
        )
        val pendingInsideRangeId = insertReservation(
            start = slotStart.plusHours(2),
            status = "PENDING",
            email = "pending-inside-range@example.com",
        )

        mockMvc.perform(
            get("/api/admin/reservations")
                .with(adminJwt())
                .param("status", "CONFIRMED")
                .param("from", iso(rangeStart))
                .param("to", iso(rangeEnd))
                .param("sort", "STARTS_AT_ASC")
                .param("page", "0")
                .param("size", "10"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[*].id", hasItem(insideRangeId)))
            .andExpect(jsonPath("$.items[*].id", not(hasItem(beforeRangeId))))
            .andExpect(jsonPath("$.items[*].id", not(hasItem(atRangeEndId))))
            .andExpect(jsonPath("$.items[*].id", not(hasItem(pendingInsideRangeId))))
    }

    @Test
    fun `admin history list includes closed reservations and past confirmed reservations`() {
        val closedId = reservationIdFrom(book(slotStart, "closed@example.com").andExpect(status().isCreated).andReturn())
        mockMvc.perform(patch("/api/admin/reservations/$closedId/reject").with(adminJwt())).andExpect(status().isOk)

        val pastConfirmedId = insertReservation(
            start = OffsetDateTime.now(zone).minusDays(2),
            status = "CONFIRMED",
            email = "past@example.com",
        )

        val futureConfirmedId = reservationIdFrom(
            book(slotStart.plusHours(2), "future@example.com").andExpect(status().isCreated).andReturn(),
        )
        mockMvc.perform(patch("/api/admin/reservations/$futureConfirmedId/confirm").with(adminJwt())).andExpect(status().isOk)

        mockMvc.perform(
            get("/api/admin/reservations")
                .with(adminJwt())
                .param("historyBefore", iso(OffsetDateTime.now(zone)))
                .param("sort", "STARTS_AT_DESC")
                .param("page", "0")
                .param("size", "10"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items[*].id", hasItem(closedId)))
            .andExpect(jsonPath("$.items[*].id", hasItem(pastConfirmedId)))
            .andExpect(jsonPath("$.items[*].id", not(hasItem(futureConfirmedId))))
    }

    @Test
    fun `admin reservation list requires authentication`() {
        mockMvc.perform(get("/api/admin/reservations"))
            .andExpect(status().isUnauthorized)
    }

    private fun seedWideOpenRuleForToday() {
        val todayDayOfWeek = OffsetDateTime.now(zone).dayOfWeek.value
        dsl.execute(
            "insert into availability_rules (day_of_week, start_time, end_time) values ($todayDayOfWeek, '00:00:00', '23:45:00')",
        )
    }

    private fun nextAvailable(): OffsetDateTime {
        val json = mockMvc.perform(get("/api/reservations/next-available"))
            .andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
        val raw = Regex(""""startsAt":"([^"]+)"""").find(json)?.groupValues?.get(1)
            ?: error("Expected a startsAt value but got: $json")
        return OffsetDateTime.parse(raw)
    }

    private fun reservationIdFrom(result: MvcResult): String =
        Regex(""""id":"([^"]+)"""")
            .find(result.response.contentAsString)
            ?.groupValues
            ?.get(1)
            ?: error("Missing reservation id")

    private fun insertReservation(start: OffsetDateTime, status: String, email: String): String {
        val customerId = UUID.randomUUID()
        val reservationId = UUID.randomUUID()

        dsl.query(
            "insert into customers (id, name, email, phone) values (?, ?, ?, ?)",
            customerId,
            "Ana",
            email,
            "+351912345678",
        ).execute()
        dsl.query(
            """
            insert into reservations (
                id, customer_id, service_id, service_variant_id, service_name,
                duration_minutes, price_cents, currency, starts_at, ends_at, status, notes
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            reservationId,
            customerId,
            UUID.fromString(serviceId),
            UUID.fromString(variantId),
            "Relaxing massage",
            60,
            7500,
            "EUR",
            start,
            start.plusHours(1),
            status,
            "Imported request",
        ).execute()

        return reservationId.toString()
    }
}
