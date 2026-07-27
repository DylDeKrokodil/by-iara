package com.byiara.api.reservation

import jakarta.mail.Session
import jakarta.mail.internet.MimeMessage
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.jooq.DSLContext
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.MvcResult
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
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
import java.util.Properties
import java.util.UUID
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
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
        dsl.execute("drop table if exists public_request_rate_limits")
        dsl.execute("drop table if exists reservation_discounts")
        dsl.execute("drop table if exists discount_services")
        dsl.execute("drop table if exists discounts")
        dsl.execute("drop table if exists customer_access_tokens")
        dsl.execute("drop table if exists pack_redemptions")
        dsl.execute("drop table if exists customer_packs")
        dsl.execute("drop table if exists reservation_payments")
        dsl.execute("drop table if exists email_logs")
        dsl.execute("drop table if exists customer_anonymization_events")
        dsl.execute("drop table if exists calendar_feed_tokens")
        dsl.execute("drop table if exists reservations")
        dsl.execute("drop table if exists customers")
        dsl.execute("drop table if exists availability_blocks")
        dsl.execute("drop table if exists availability_rules")
        dsl.execute("drop table if exists service_faqs")
        dsl.execute("drop table if exists service_images")
        dsl.execute("drop table if exists service_translations")
        dsl.execute("drop table if exists pack_offers")
        dsl.execute("drop table if exists service_variants")
        dsl.execute("drop table if exists services")
        dsl.execute("drop table if exists admin_users")

        dsl.execute(
            """
            create table public_request_rate_limits (
                scope varchar(40) not null,
                key_hash varchar(64) not null,
                window_started_at timestamp with time zone not null,
                request_count integer not null,
                updated_at timestamp with time zone not null default now(),
                primary key (scope, key_hash)
            )
            """.trimIndent(),
        )
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
            create table service_images (
                service_id uuid primary key references services(id) on delete cascade,
                content_type varchar(32) not null,
                width integer not null,
                height integer not null,
                byte_size integer not null,
                storage_key varchar(500) not null unique,
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
            create table pack_offers (
                id uuid default random_uuid() primary key,
                service_id uuid not null references services(id) on delete cascade,
                duration_minutes integer not null,
                session_count integer not null,
                price_cents bigint not null,
                currency varchar(3) not null default 'EUR',
                validity_days integer,
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
                slug varchar(140),
                name varchar(160) not null,
                description text,
                treatment_description text,
                suitable_for text,
                session_description text,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now(),
                primary key (service_id, locale)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table service_faqs (
                id uuid default random_uuid() primary key,
                service_id uuid not null,
                locale varchar(10) not null,
                question text not null,
                answer text not null,
                sort_order integer not null default 0,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now(),
                foreign key (service_id, locale) references service_translations(service_id, locale) on delete cascade
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
                anonymized_at timestamp with time zone,
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
                rejection_reason_code varchar(40),
                rejection_message varchar(1000),
                decided_at timestamp with time zone,
                cancellation_reason_code varchar(40),
                cancellation_message varchar(1000),
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
            create table discounts (
                id uuid default random_uuid() primary key,
                name varchar(160) not null,
                audience varchar(20) not null,
                scope varchar(30) not null,
                value_type varchar(20) not null,
                value_amount bigint not null,
                currency varchar(3),
                starts_at timestamp with time zone not null,
                ends_at timestamp with time zone not null,
                max_unique_clients integer,
                max_uses_per_customer integer not null default 1,
                code_hash varchar(64) not null unique,
                code_hint varchar(40) not null,
                customer_id uuid references customers(id),
                status varchar(20) not null default 'ACTIVE',
                public_code varchar(100),
                featured boolean not null default false,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table discount_services (
                discount_id uuid not null references discounts(id),
                service_id uuid not null references services(id),
                primary key (discount_id, service_id)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table reservation_discounts (
                id uuid default random_uuid() primary key,
                reservation_id uuid not null unique references reservations(id),
                discount_id uuid references discounts(id),
                customer_id uuid not null references customers(id),
                customer_identity_key varchar(255) not null,
                discount_name varchar(160) not null,
                code_hint varchar(40) not null,
                value_type varchar(20) not null,
                value_amount bigint not null,
                original_price_cents bigint not null,
                discount_amount_cents bigint not null,
                final_price_cents bigint not null,
                currency varchar(3) not null,
                status varchar(20) not null default 'RESERVED',
                reserved_at timestamp with time zone not null default now(),
                consumed_at timestamp with time zone,
                released_at timestamp with time zone,
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table reservation_payments (
                id uuid default random_uuid() primary key,
                reservation_id uuid not null references reservations(id),
                amount_cents bigint not null,
                currency varchar(3) not null,
                method varchar(30) not null,
                status varchar(20) not null default 'PAID',
                paid_at timestamp with time zone not null,
                reference varchar(255),
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table customer_packs (
                id uuid default random_uuid() primary key,
                customer_id uuid not null references customers(id),
                pack_offer_id uuid references pack_offers(id) on delete set null,
                originating_reservation_id uuid not null unique references reservations(id),
                status varchar(30) not null,
                service_id uuid references services(id) on delete set null,
                service_name varchar(160) not null,
                duration_minutes integer not null,
                total_sessions integer not null,
                validity_days integer,
                price_cents bigint not null,
                currency varchar(3) not null,
                activated_at timestamp with time zone,
                expires_at timestamp with time zone,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table pack_redemptions (
                id uuid default random_uuid() primary key,
                customer_pack_id uuid not null references customer_packs(id),
                reservation_id uuid not null unique references reservations(id),
                status varchar(20) not null,
                reserved_at timestamp with time zone not null default now(),
                consumed_at timestamp with time zone,
                released_at timestamp with time zone,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table customer_access_tokens (
                id uuid default random_uuid() primary key,
                customer_id uuid not null references customers(id),
                token_hash varchar(64) not null unique,
                token_type varchar(20) not null,
                expires_at timestamp with time zone not null,
                used_at timestamp with time zone,
                created_at timestamp with time zone not null default now()
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
        dsl.execute(
            """
            create table customer_anonymization_events (
                id uuid default random_uuid() primary key,
                customer_id uuid not null unique references customers(id),
                performed_by varchar(255) not null,
                scope_version integer not null,
                anonymized_at timestamp with time zone not null
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

        // Confirm/reject emails carry an HTML alternative via MimeMessage; a raw mock's
        // createMimeMessage() returns null by default, which would NPE inside MimeMessageHelper.
        val session = Session.getInstance(Properties())
        Mockito.`when`(mailSender.createMimeMessage()).thenAnswer { MimeMessage(session) }
    }

    private fun adminJwt(): RequestPostProcessor =
        jwt().jwt { it.claim("email", "admin@by-iara.local").claim("role", "ADMIN") }

    private fun rejectRequest(id: String) =
        patch("/api/admin/reservations/$id/reject")
            .with(adminJwt())
            .contentType("application/json")
            .content(
                """{"reasonCode":"TIME_UNAVAILABLE","message":"The requested time is no longer available."}""",
            )

    private fun cancelRequest(id: String) =
        patch("/api/admin/reservations/$id/cancel")
            .with(adminJwt())
            .contentType("application/json")
            .content(
                """{"reasonCode":"SCHEDULE_CHANGE","message":"We need to change our schedule."}""",
            )

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
    fun `public booking rejects an email without a fully qualified domain`() {
        book(slotStart, email = "dylankoffiemok@gmail")
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `booking email is limited to five requests per minute`() {
        repeat(5) { index ->
            book(slotStart.plusHours(index.toLong()), email = "limited@example.com")
                .andExpect(status().isCreated)
        }

        book(slotStart.plusHours(5), email = "limited@example.com")
            .andExpect(status().isTooManyRequests)
            .andExpect(jsonPath("$.message").value("Too many requests. Try again later"))
            .andExpect { result ->
                assertTrue(result.response.getHeader("Retry-After")!!.toLong() in 1..60)
            }
    }

    @Test
    fun `customer access email is limited to two requests per minute`() {
        val request = post("/api/customer-access/request")
            .contentType("application/json")
            .content("""{"email":"packs@example.com","locale":"en"}""")

        repeat(2) {
            mockMvc.perform(request).andExpect(status().isAccepted)
        }

        mockMvc.perform(request)
            .andExpect(status().isTooManyRequests)
            .andExpect { result ->
                assertTrue(result.response.getHeader("Retry-After")!!.toLong() in 1..60)
            }
    }

    @Test
    fun `unverified booking cannot overwrite an existing customer contact record`() {
        dsl.execute(
            """
            insert into customers (name, email, phone)
            values ('Existing customer', 'ana@example.com', '+351900000000')
            """.trimIndent(),
        )

        book(slotStart, email = "ana@example.com")
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.customer.name").value("Existing customer"))
            .andExpect(jsonPath("$.customer.phone").value("+351900000000"))

        val customer = dsl.fetchOne(
            "select name, phone from customers where email = 'ana@example.com'",
        )!!
        assertEquals("Existing customer", customer.get("name"))
        assertEquals("+351900000000", customer.get("phone"))
    }

    @Test
    fun `admin creates a service discount and customer sees and reserves the reduced price`() {
        val startsAt = OffsetDateTime.now(zone).minusHours(1)
        val endsAt = OffsetDateTime.now(zone).plusDays(30)
        mockMvc.perform(
            post("/api/admin/discounts")
                .with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "name":"Summer massage",
                      "audience":"PUBLIC",
                      "scope":"SELECTED_SERVICES",
                      "valueType":"PERCENTAGE",
                      "valueAmount":2000,
                      "startsAt":"${iso(startsAt)}",
                      "endsAt":"${iso(endsAt)}",
                      "maxUniqueClients":10,
                      "maxUsesPerCustomer":1,
                      "serviceIds":["$serviceId"],
                      "code":"SAVE20",
                      "featured":true
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.discount.codeHint").value("SAVE20"))
            .andExpect(jsonPath("$.discount.featured").value(true))

        mockMvc.perform(get("/api/discounts/featured"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.code").value("SAVE20"))
            .andExpect(jsonPath("$.valueAmount").value(2000))

        mockMvc.perform(
            post("/api/reservations/discount-preview")
                .contentType("application/json")
                .content(
                    """{"serviceId":"$serviceId","serviceVariantId":"$variantId","customerEmail":"discount@example.com","discountCode":"save20"}""",
                ),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.originalPrice.amountCents").value(7500))
            .andExpect(jsonPath("$.discountAmount.amountCents").value(1500))
            .andExpect(jsonPath("$.finalPrice.amountCents").value(6000))

        val result = mockMvc.perform(
            post("/api/reservations")
                .contentType("application/json")
                .content(
                    """
                    {
                      "serviceId":"$serviceId",
                      "serviceVariantId":"$variantId",
                      "startsAt":"${iso(slotStart)}",
                      "customer":{"name":"Discount Customer","email":"discount@example.com"},
                      "discountCode":"SAVE20"
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.price.amountCents").value(6000))
            .andReturn()

        val reservationId = reservationIdFrom(result)
        assertEquals("RESERVED", dsl.fetchValue("select status from reservation_discounts where reservation_id = ?", UUID.fromString(reservationId)))
        assertEquals(1500L, dsl.fetchValue("select discount_amount_cents from reservation_discounts where reservation_id = ?", UUID.fromString(reservationId), Long::class.java))

        mockMvc.perform(
            post("/api/reservations/discount-preview")
                .contentType("application/json")
                .content(
                    """{"serviceId":"$serviceId","serviceVariantId":"$variantId","customerEmail":"discount+again@example.com","discountCode":"SAVE20"}""",
                ),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `personal discount code is generated securely and only works for its customer`() {
        insertReservation(
            start = OffsetDateTime.now(zone).minusDays(2),
            status = "COMPLETED",
            email = "personal@example.com",
        )
        val response = mockMvc.perform(
            post("/api/admin/discounts")
                .with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "name":"Thank you",
                      "audience":"PERSONAL",
                      "scope":"ALL_SERVICES",
                      "valueType":"FIXED_AMOUNT",
                      "valueAmount":1000,
                      "currency":"EUR",
                      "startsAt":"${iso(OffsetDateTime.now(zone).minusHours(1))}",
                      "endsAt":"${iso(OffsetDateTime.now(zone).plusDays(14))}",
                      "customerEmail":"personal@example.com",
                      "sendEmail":true
                    }
                    """.trimIndent(),
                ),
        ).andExpect(status().isCreated).andReturn().response.contentAsString
        val code = Regex(""""generatedCode":"([^"]+)"""").find(response)?.groupValues?.get(1)
            ?: error("Missing generated personal code: $response")
        assertTrue(code.length >= 25)
        assertEquals(64L, dsl.fetchValue("select length(code_hash) from discounts", Long::class.java))
        assertEquals(
            "SENT",
            dsl.fetchValue("select status from email_logs where email_type = 'PERSONAL_DISCOUNT'", String::class.java),
        )

        fun preview(email: String) = mockMvc.perform(
            post("/api/reservations/discount-preview")
                .contentType("application/json")
                .content("""{"serviceId":"$serviceId","serviceVariantId":"$variantId","customerEmail":"$email","discountCode":"$code"}"""),
        )
        preview("attacker@example.com").andExpect(status().isBadRequest)
        preview("personal@example.com")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.finalPrice.amountCents").value(6500))
    }

    @Test
    fun `discount codes cannot be combined with a pack purchase`() {
        mockMvc.perform(
            post("/api/reservations")
                .contentType("application/json")
                .content(
                    """
                    {
                      "serviceId":"$serviceId",
                      "serviceVariantId":"$variantId",
                      "startsAt":"${iso(slotStart)}",
                      "customer":{"name":"Pack Customer","email":"pack-discount@example.com"},
                      "packOfferId":"${UUID.randomUUID()}",
                      "discountCode":"NOT-ALLOWED"
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value("Discounts are only available for individual sessions"))
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

        mockMvc.perform(rejectRequest(id)).andExpect(status().isOk)
            .andExpect(jsonPath("$.rejectionReasonCode").value("TIME_UNAVAILABLE"))
            .andExpect(jsonPath("$.rejectionMessage").value("The requested time is no longer available."))
            .andExpect(jsonPath("$.decidedAt").exists())

        val logs = dsl.fetch("select recipient, status from email_logs where email_type = 'RESERVATION_REJECTED'")
        assertEquals(1, logs.size)
        assertEquals("ana@example.com", logs[0].get("recipient", String::class.java))
        assertEquals("SENT", logs[0].get("status", String::class.java))
    }

    @Test
    fun `admin can cancel a confirmed reservation with a reason and notify the customer`() {
        val id = reservationIdFrom(book(slotStart, "cancel@example.com").andExpect(status().isCreated).andReturn())
        mockMvc.perform(patch("/api/admin/reservations/$id/confirm").with(adminJwt())).andExpect(status().isOk)

        mockMvc.perform(cancelRequest(id))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("CANCELLED"))
            .andExpect(jsonPath("$.cancellationReasonCode").value("SCHEDULE_CHANGE"))
            .andExpect(jsonPath("$.cancellationMessage").value("We need to change our schedule."))
            .andExpect(jsonPath("$.decidedAt").exists())

        val logs = dsl.fetch("select recipient, status from email_logs where email_type = 'RESERVATION_CANCELLED'")
        assertEquals(1, logs.size)
        assertEquals("cancel@example.com", logs[0].get("recipient", String::class.java))
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
    fun `admin can complete a past confirmed reservation and record its payment atomically`() {
        val id = insertReservation(
            start = OffsetDateTime.now(zone).minusHours(2),
            status = "CONFIRMED",
            email = "complete@example.com",
        )

        mockMvc.perform(
            patch("/api/admin/reservations/$id/complete")
                .with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "payment":{"amountCents":7500,"currency":"EUR","method":"CARD","reference":"terminal-42"},
                      "discount":{"valueType":"PERCENTAGE","valueAmount":1500,"validityDays":21,"sameServiceOnly":true}
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("COMPLETED"))

        mockMvc.perform(get("/api/admin/reservations/$id/payments").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].method").value("CARD"))
            .andExpect(jsonPath("$.items[0].reference").value("terminal-42"))
            .andExpect(jsonPath("$.summary.totalPaidCents").value(7500))
            .andExpect(jsonPath("$.summary.balanceDueCents").value(0))
            .andExpect(jsonPath("$.summary.state").value("PAID"))

        val completionEmail = dsl.fetchOne(
            "select recipient, status from email_logs where email_type = 'RESERVATION_COMPLETED'",
        )!!
        assertEquals("complete@example.com", completionEmail.get("recipient", String::class.java))
        assertEquals("SENT", completionEmail.get("status", String::class.java))
        assertEquals("PERSONAL", dsl.fetchValue("select audience from discounts", String::class.java))
        assertEquals(1, dsl.fetchValue("select max_uses_per_customer from discounts", Int::class.java))
        assertEquals(1L, dsl.fetchValue("select count(*) from discount_services", Long::class.java))
        assertEquals(0L, dsl.fetchValue("select count(*) from email_logs where email_type = 'PERSONAL_DISCOUNT'", Long::class.java))
    }

    @Test
    fun `customer can buy access and redeem a session pack through email verification`() {
        val offerId = UUID.randomUUID()
        dsl.query(
            """
            insert into pack_offers (
                id, service_id, duration_minutes, session_count, price_cents,
                currency, validity_days, active, sort_order
            ) values (?, ?, 60, 4, 14000, 'EUR', 365, true, 0)
            """.trimIndent(),
            offerId,
            UUID.fromString(serviceId),
        ).execute()

        val firstResult = mockMvc.perform(
            post("/api/reservations")
                .contentType("application/json")
                .content(
                    """
                    {
                      "serviceId": "$serviceId",
                      "serviceVariantId": "$variantId",
                      "startsAt": "${iso(slotStart)}",
                      "customer": { "name": "Pack Customer", "email": "pack@example.com" },
                      "packOfferId": "$offerId",
                      "locale": "en"
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.price.amountCents").value(14000))
            .andReturn()
        val firstReservationId = reservationIdFrom(firstResult)

        assertEquals(
            "PENDING_PAYMENT",
            dsl.fetchValue("select status from customer_packs where originating_reservation_id = ?", firstReservationId),
        )

        dsl.query(
            "update reservations set starts_at = ?, ends_at = ? where id = ?",
            OffsetDateTime.now(zone).minusHours(2),
            OffsetDateTime.now(zone).minusHours(1),
            UUID.fromString(firstReservationId),
        ).execute()
        mockMvc.perform(patch("/api/admin/reservations/$firstReservationId/confirm").with(adminJwt()))
            .andExpect(status().isOk)
        mockMvc.perform(
            patch("/api/admin/reservations/$firstReservationId/complete")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"payment":{"amountCents":14000,"currency":"EUR","method":"CARD"}}"""),
        ).andExpect(status().isOk)

        val customerPackId = dsl.fetchValue(
            "select id from customer_packs where originating_reservation_id = ?",
            UUID.fromString(firstReservationId),
            UUID::class.java,
        )!!
        assertEquals("ACTIVE", dsl.fetchValue("select status from customer_packs where id = ?", customerPackId))
        assertEquals(
            "CONSUMED",
            dsl.fetchValue("select status from pack_redemptions where reservation_id = ?", firstReservationId),
        )

        val customerId = dsl.fetchValue(
            "select customer_id from customer_packs where id = ?",
            customerPackId,
            UUID::class.java,
        )!!
        val magicToken = "integration-magic-token"
        dsl.query(
            "insert into customer_access_tokens (customer_id, token_hash, token_type, expires_at) values (?, ?, 'MAGIC_LINK', ?)",
            customerId,
            sha256(magicToken),
            OffsetDateTime.now().plusMinutes(10),
        ).execute()
        val exchangeJson = mockMvc.perform(
            post("/api/customer-access/exchange")
                .contentType("application/json")
                .content("""{"token":"$magicToken"}"""),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.packs[0].remainingSessions").value(3))
            .andReturn().response.contentAsString
        val customerSessionToken = Regex(""""sessionToken":"([^"]+)"""")
            .find(exchangeJson)?.groupValues?.get(1) ?: error("Missing customer session token")

        val secondResult = mockMvc.perform(
            post("/api/reservations")
                .contentType("application/json")
                .content(
                    """
                    {
                      "serviceId": "$serviceId",
                      "serviceVariantId": "$variantId",
                      "startsAt": "${iso(slotStart.plusHours(2))}",
                      "customer": { "name": "Ignored", "email": "ignored@example.com" },
                      "customerPackId": "$customerPackId",
                      "customerSessionToken": "$customerSessionToken",
                      "locale": "en"
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.price.amountCents").value(0))
            .andExpect(jsonPath("$.customer.email").value("pack@example.com"))
            .andReturn()
        val secondReservationId = reservationIdFrom(secondResult)

        mockMvc.perform(get("/api/admin/packs").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].remainingSessions").value(2))

        mockMvc.perform(cancelRequest(secondReservationId)).andExpect(status().isOk)
        mockMvc.perform(get("/api/admin/packs").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].remainingSessions").value(3))
    }

    @Test
    fun `future confirmed reservation cannot be completed or marked no-show`() {
        val id = insertReservation(slotStart, "CONFIRMED", "future-closeout@example.com")

        mockMvc.perform(
            patch("/api/admin/reservations/$id/complete")
                .with(adminJwt())
                .contentType("application/json")
                .content("{}"),
        ).andExpect(status().isBadRequest)

        mockMvc.perform(patch("/api/admin/reservations/$id/no-show").with(adminJwt()))
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `admin can mark a started confirmed reservation as no-show`() {
        val id = insertReservation(
            start = OffsetDateTime.now(zone).minusMinutes(30),
            status = "CONFIRMED",
            email = "no-show@example.com",
        )

        mockMvc.perform(patch("/api/admin/reservations/$id/no-show").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("NO_SHOW"))
    }

    @Test
    fun `admin can record partial payments without overpaying`() {
        val id = insertReservation(slotStart, "CONFIRMED", "partial@example.com")

        mockMvc.perform(
            post("/api/admin/reservations/$id/payments")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"amountCents":2500,"currency":"EUR","method":"CASH"}"""),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.amountCents").value(2500))

        mockMvc.perform(get("/api/admin/reservations/$id/payments").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.summary.state").value("PARTIALLY_PAID"))
            .andExpect(jsonPath("$.summary.balanceDueCents").value(5000))

        mockMvc.perform(
            post("/api/admin/reservations/$id/payments")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"amountCents":5001,"currency":"EUR","method":"CASH"}"""),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `attention queue includes approvals overdue outcomes and completed balances only`() {
        val pendingId = insertReservation(slotStart, "PENDING", "attention-pending@example.com")
        val outcomeId = insertReservation(
            OffsetDateTime.now(zone).minusHours(2),
            "CONFIRMED",
            "attention-outcome@example.com",
        )
        val paymentId = insertReservation(
            OffsetDateTime.now(zone).minusDays(1),
            "COMPLETED",
            "attention-payment@example.com",
        )
        val paidId = insertReservation(
            OffsetDateTime.now(zone).minusDays(2),
            "COMPLETED",
            "attention-paid@example.com",
        )
        dsl.query(
            "insert into reservation_payments (reservation_id, amount_cents, currency, method, status, paid_at) values (?, ?, ?, ?, ?, ?)",
            UUID.fromString(paidId), 7500, "EUR", "CARD", "PAID", OffsetDateTime.now(zone),
        ).execute()

        mockMvc.perform(get("/api/admin/reservations/attention").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.items[*].reservation.id", hasItem(pendingId)))
            .andExpect(jsonPath("$.items[*].reservation.id", hasItem(outcomeId)))
            .andExpect(jsonPath("$.items[*].reservation.id", hasItem(paymentId)))
            .andExpect(jsonPath("$.items[*].reservation.id", not(hasItem(paidId))))
            .andExpect(jsonPath("$.items[0].reason").value("OUTCOME_REQUIRED"))
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
        mockMvc.perform(rejectRequest(closedId)).andExpect(status().isOk)

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

    @Test
    fun `admin can search customers by email case insensitively`() {
        val completedReservationId = UUID.fromString(
            insertReservation(
                start = OffsetDateTime.now(zone).minusDays(3),
                status = "COMPLETED",
                email = "customer-search@example.com",
            ),
        )
        val customerId = dsl.fetchOne(
            "select customer_id from reservations where id = ?",
            completedReservationId,
        )!!.get("customer_id", UUID::class.java)
        val packId = UUID.randomUUID()
        dsl.query(
            """
            insert into customer_packs (
                id, customer_id, originating_reservation_id, status, service_id,
                service_name, duration_minutes, total_sessions, validity_days,
                price_cents, currency, activated_at, expires_at
            ) values (?, ?, ?, 'ACTIVE', ?, 'Relaxing massage', 60, 5, 180,
                30000, 'EUR', ?, ?)
            """.trimIndent(),
            packId,
            customerId,
            completedReservationId,
            UUID.fromString(serviceId),
            OffsetDateTime.now(zone).minusDays(3),
            OffsetDateTime.now(zone).plusDays(177),
        ).execute()
        dsl.query(
            """
            insert into pack_redemptions (
                customer_pack_id, reservation_id, status, consumed_at
            ) values (?, ?, 'CONSUMED', ?)
            """.trimIndent(),
            packId,
            completedReservationId,
            OffsetDateTime.now(zone).minusDays(3),
        ).execute()
        insertReservation(
            start = slotStart,
            status = "CONFIRMED",
            email = "customer-search-secondary@example.com",
        )

        mockMvc.perform(
            get("/api/admin/customers")
                .with(adminJwt())
                .param("email", "CUSTOMER-SEARCH@EXAMPLE.COM"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].name").value("Ana"))
            .andExpect(jsonPath("$.items[0].email").value("customer-search@example.com"))
            .andExpect(jsonPath("$.items[0].reservationCount").value(1))
            .andExpect(jsonPath("$.items[0].completedReservationCount").value(1))
            .andExpect(jsonPath("$.items[0].activeReservationCount").value(0))
            .andExpect(jsonPath("$.items[0].lastCompletedAt").isNotEmpty)
            .andExpect(jsonPath("$.items[0].nextReservationAt").doesNotExist())
            .andExpect(jsonPath("$.items[0].packs[0].id").value(packId.toString()))
            .andExpect(jsonPath("$.items[0].packs[0].status").value("ACTIVE"))
            .andExpect(jsonPath("$.items[0].packs[0].serviceName").value("Relaxing massage"))
            .andExpect(jsonPath("$.items[0].packs[0].remainingSessions").value(4))
            .andExpect(jsonPath("$.items[0].packs[0].totalSessions").value(5))
            .andExpect(jsonPath("$.items[0].packs[0].priceCents").value(30000))
    }

    @Test
    fun `admin customer search requires authentication`() {
        mockMvc.perform(
            get("/api/admin/customers")
                .param("email", "customer@example.com"),
        ).andExpect(status().isUnauthorized)
    }

    @Test
    fun `admin can anonymise personal data while retaining financial and service facts`() {
        val email = "erase-me@example.com"
        val reservationId = UUID.fromString(
            insertReservation(
                start = OffsetDateTime.now(zone).minusDays(3),
                status = "COMPLETED",
                email = email,
            ),
        )
        val customerId = dsl.fetchOne(
            "select customer_id from reservations where id = ?",
            reservationId,
        )!!.get("customer_id", UUID::class.java)
        val discountId = UUID.randomUUID()

        dsl.query(
            """
            update reservations
            set rejection_message = ?, cancellation_message = ?
            where id = ?
            """.trimIndent(),
            "Customer named Ana requested another time",
            "Ana cancelled by phone",
            reservationId,
        ).execute()
        dsl.query(
            """
            insert into email_logs (reservation_id, recipient, email_type, status, error_message)
            values (?, ?, 'CONFIRMATION', 'FAILED', ?)
            """.trimIndent(),
            reservationId,
            email,
            "Could not deliver to $email",
        ).execute()
        dsl.query(
            """
            insert into email_logs (recipient, email_type, status, error_message)
            values (?, 'CUSTOMER_ACCESS', 'SENT', null)
            """.trimIndent(),
            email.uppercase(),
        ).execute()
        dsl.query(
            """
            insert into reservation_payments (
                reservation_id, amount_cents, currency, method, status, paid_at, reference
            ) values (?, 7500, 'EUR', 'CARD', 'PAID', ?, ?)
            """.trimIndent(),
            reservationId,
            OffsetDateTime.now(zone),
            "Receipt for Ana",
        ).execute()
        dsl.query(
            """
            insert into discounts (
                id, name, audience, scope, value_type, value_amount, starts_at, ends_at,
                max_uses_per_customer, code_hash, code_hint, customer_id, status
            ) values (?, 'Returning client', 'PERSONAL', 'ALL_SERVICES', 'PERCENTAGE', 10,
                ?, ?, 1, ?, 'RET…', ?, 'ACTIVE')
            """.trimIndent(),
            discountId,
            OffsetDateTime.now(zone).minusDays(1),
            OffsetDateTime.now(zone).plusDays(30),
            UUID.randomUUID().toString(),
            customerId,
        ).execute()
        dsl.query(
            """
            insert into reservation_discounts (
                reservation_id, discount_id, customer_id, customer_identity_key,
                discount_name, code_hint, value_type, value_amount, original_price_cents,
                discount_amount_cents, final_price_cents, currency, status
            ) values (?, ?, ?, ?, 'Returning client', 'RET…', 'PERCENTAGE', 10,
                7500, 750, 6750, 'EUR', 'CONSUMED')
            """.trimIndent(),
            reservationId,
            discountId,
            customerId,
            email,
        ).execute()
        dsl.query(
            """
            insert into customer_access_tokens (
                customer_id, token_hash, token_type, expires_at
            ) values (?, ?, 'SESSION', ?)
            """.trimIndent(),
            customerId,
            UUID.randomUUID().toString(),
            OffsetDateTime.now(zone).plusDays(1),
        ).execute()

        mockMvc.perform(
            delete("/api/admin/customers/$customerId/personal-data")
                .with(adminJwt()),
        ).andExpect(status().isNoContent)

        val customer = dsl.fetchOne(
            "select name, email, phone, anonymized_at from customers where id = ?",
            customerId,
        )!!
        assertEquals("Anonymised customer", customer.get("name"))
        assertEquals("anonymised+$customerId@customer.invalid", customer.get("email"))
        assertNull(customer.get("phone"))
        assertTrue(customer.get("anonymized_at") != null)

        val reservation = dsl.fetchOne(
            """
            select service_name, price_cents, status, notes, rejection_message, cancellation_message
            from reservations where id = ?
            """.trimIndent(),
            reservationId,
        )!!
        assertEquals("Relaxing massage", reservation.get("service_name"))
        assertEquals(7500L, reservation.get("price_cents"))
        assertEquals("COMPLETED", reservation.get("status"))
        assertNull(reservation.get("notes"))
        assertNull(reservation.get("rejection_message"))
        assertNull(reservation.get("cancellation_message"))

        val payment = dsl.fetchOne(
            """
            select amount_cents, currency, method, status, reference
            from reservation_payments where reservation_id = ?
            """.trimIndent(),
            reservationId,
        )!!
        assertEquals(7500L, payment.get("amount_cents"))
        assertEquals("EUR", payment.get("currency"))
        assertEquals("CARD", payment.get("method"))
        assertEquals("PAID", payment.get("status"))
        assertNull(payment.get("reference"))

        val emailLog = dsl.fetchOne(
            "select recipient, email_type, status, error_message from email_logs where reservation_id = ?",
            reservationId,
        )!!
        assertEquals("anonymised+$customerId@customer.invalid", emailLog.get("recipient"))
        assertEquals("CONFIRMATION", emailLog.get("email_type"))
        assertEquals("FAILED", emailLog.get("status"))
        assertNull(emailLog.get("error_message"))
        assertEquals(
            2L,
            dsl.fetchValue(
                "select count(*) from email_logs where recipient = ?",
                "anonymised+$customerId@customer.invalid",
            ),
        )

        assertEquals(
            "anonymised:$customerId",
            dsl.fetchValue(
                "select customer_identity_key from reservation_discounts where reservation_id = ?",
                reservationId,
            ),
        )
        assertEquals(
            0L,
            dsl.fetchValue(
                "select count(*) from customer_access_tokens where customer_id = ?",
                customerId,
            ),
        )
        assertEquals(
            "admin@by-iara.local",
            dsl.fetchValue(
                "select performed_by from customer_anonymization_events where customer_id = ?",
                customerId,
            ),
        )

        mockMvc.perform(
            get("/api/admin/customers")
                .with(adminJwt())
                .param("email", email),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `customer anonymisation requires authentication`() {
        mockMvc.perform(
            delete("/api/admin/customers/${UUID.randomUUID()}/personal-data"),
        ).andExpect(status().isUnauthorized)
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

    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(StandardCharsets.UTF_8))
        .joinToString("") { "%02x".format(it) }

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
