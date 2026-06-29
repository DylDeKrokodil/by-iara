package com.byiara.api.reservation

import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.ActiveProfiles
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReservationApiTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    private val zone = ZoneId.of("Europe/Brussels")
    private val serviceId = "11111111-1111-1111-1111-111111111111"
    private val variantId = "22222222-2222-2222-2222-222222222222"

    // A future weekday slot at 10:00 local, with a 09:00-17:00 rule seeded for that weekday.
    private val slotStart: OffsetDateTime =
        LocalDate.now(zone).plusDays(7).atTime(10, 0).atZone(zone).toOffsetDateTime()

    @BeforeEach
    fun resetSchema() {
        dsl.execute("drop table if exists reservations")
        dsl.execute("drop table if exists customers")
        dsl.execute("drop table if exists availability_blocks")
        dsl.execute("drop table if exists availability_rules")
        dsl.execute("drop table if exists service_translations")
        dsl.execute("drop table if exists service_variants")
        dsl.execute("drop table if exists services")

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
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )

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
    fun `confirming an already confirmed reservation is rejected`() {
        val id = reservationIdFrom(book(slotStart).andExpect(status().isCreated).andReturn())

        mockMvc.perform(patch("/api/admin/reservations/$id/confirm").with(adminJwt())).andExpect(status().isOk)
        mockMvc.perform(patch("/api/admin/reservations/$id/confirm").with(adminJwt()))
            .andExpect(status().isConflict)
    }

    @Test
    fun `admin reservation list requires authentication`() {
        mockMvc.perform(get("/api/admin/reservations"))
            .andExpect(status().isUnauthorized)
    }

    private fun reservationIdFrom(result: MvcResult): String =
        Regex(""""id":"([^"]+)"""")
            .find(result.response.contentAsString)
            ?.groupValues
            ?.get(1)
            ?: error("Missing reservation id")
}
