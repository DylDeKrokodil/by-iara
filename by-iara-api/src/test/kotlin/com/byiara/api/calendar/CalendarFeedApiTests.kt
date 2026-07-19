package com.byiara.api.calendar

import org.jooq.DSLContext
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.OffsetDateTime
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CalendarFeedApiTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    @BeforeEach
    fun resetSchema() {
        dsl.execute("drop table if exists calendar_feed_tokens")
        dsl.execute("drop table if exists reservations")
        dsl.execute("drop table if exists customers")
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
                service_id uuid,
                service_variant_id uuid,
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
            create table calendar_feed_tokens (
                id uuid default random_uuid() primary key,
                admin_user_id uuid not null references admin_users(id) on delete cascade,
                token_hash varchar(64) not null unique,
                revoked_at timestamp with time zone,
                created_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )

        dsl.execute(
            "insert into admin_users (email, password_hash, role, active) " +
                "values ('admin@by-iara.local', 'x', 'ADMIN', true)",
        )
        dsl.execute(
            "insert into admin_users (email, password_hash, role, active) " +
                "values ('admin2@by-iara.local', 'x', 'ADMIN', true)",
        )
    }

    private fun adminJwt(): RequestPostProcessor =
        jwt().jwt { it.claim("email", "admin@by-iara.local").claim("role", "ADMIN") }

    private fun admin2Jwt(): RequestPostProcessor =
        jwt().jwt { it.claim("email", "admin2@by-iara.local").claim("role", "ADMIN") }

    private fun insertReservation(start: OffsetDateTime, status: String, serviceName: String): String {
        val customerId = UUID.randomUUID()
        val reservationId = UUID.randomUUID()

        dsl.query(
            "insert into customers (id, name, email, phone) values (?, ?, ?, ?)",
            customerId,
            "Ana",
            "$reservationId@example.com",
            null,
        ).execute()
        dsl.query(
            """
            insert into reservations (
                id, customer_id, service_name, duration_minutes, price_cents, currency, starts_at, ends_at, status
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            reservationId,
            customerId,
            serviceName,
            60,
            7500,
            "EUR",
            start,
            start.plusHours(1),
            status,
        ).execute()

        return reservationId.toString()
    }

    private fun tokenFrom(httpsUrl: String): String =
        Regex("""/api/calendar-feed/([^./]+)\.ics""").find(httpsUrl)?.groupValues?.get(1)
            ?: error("Could not extract token from $httpsUrl")

    private fun regenerateAndGetUrl(jwt: RequestPostProcessor = adminJwt()): String {
        val json = mockMvc.perform(post("/api/admin/calendar-feed").with(jwt))
            .andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
        return Regex(""""httpsUrl":"([^"]+)"""").find(json)?.groupValues?.get(1)
            ?: error("Missing httpsUrl in response: $json")
    }

    @Test
    fun `admin calendar feed endpoints require authentication`() {
        mockMvc.perform(get("/api/admin/calendar-feed")).andExpect(status().isUnauthorized)
        mockMvc.perform(post("/api/admin/calendar-feed")).andExpect(status().isUnauthorized)
        mockMvc.perform(delete("/api/admin/calendar-feed")).andExpect(status().isUnauthorized)
    }

    @Test
    fun `status is inactive until a link has been generated`() {
        mockMvc.perform(get("/api/admin/calendar-feed").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.active").value(false))
    }

    @Test
    fun `regenerate activates the feed and status reflects it`() {
        mockMvc.perform(post("/api/admin/calendar-feed").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.httpsUrl").exists())
            .andExpect(jsonPath("$.webcalUrl").exists())

        mockMvc.perform(get("/api/admin/calendar-feed").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.active").value(true))
            .andExpect(jsonPath("$.createdAt").exists())
    }

    @Test
    fun `the generated link actually serves the feed`() {
        val token = tokenFrom(regenerateAndGetUrl())

        mockMvc.perform(get("/api/calendar-feed/$token.ics"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith("text/calendar"))
    }

    @Test
    fun `regenerating invalidates the previous link`() {
        val firstToken = tokenFrom(regenerateAndGetUrl())
        mockMvc.perform(get("/api/calendar-feed/$firstToken.ics")).andExpect(status().isOk)

        val secondToken = tokenFrom(regenerateAndGetUrl())
        assertNotEquals(firstToken, secondToken)

        mockMvc.perform(get("/api/calendar-feed/$firstToken.ics")).andExpect(status().isNotFound)
        mockMvc.perform(get("/api/calendar-feed/$secondToken.ics")).andExpect(status().isOk)
    }

    @Test
    fun `revoke disables the feed and the old link 404s`() {
        val token = tokenFrom(regenerateAndGetUrl())

        mockMvc.perform(delete("/api/admin/calendar-feed").with(adminJwt()))
            .andExpect(status().isNoContent)

        mockMvc.perform(get("/api/admin/calendar-feed").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.active").value(false))
        mockMvc.perform(get("/api/calendar-feed/$token.ics"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `an unknown token 404s without needing authentication`() {
        mockMvc.perform(get("/api/calendar-feed/not-a-real-token.ics"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `feed includes pending and confirmed reservations only, service and status only`() {
        insertReservation(start = OffsetDateTime.now().plusDays(1), status = "PENDING", serviceName = "Haircut")
        insertReservation(start = OffsetDateTime.now().plusDays(2), status = "CONFIRMED", serviceName = "Manicure")
        insertReservation(start = OffsetDateTime.now().plusDays(3), status = "CANCELLED", serviceName = "Massage")

        val token = tokenFrom(regenerateAndGetUrl())
        val body = mockMvc.perform(get("/api/calendar-feed/$token.ics"))
            .andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString

        assertEquals(2, Regex("BEGIN:VEVENT").findAll(body).count())
        assertTrue(body.contains("Haircut (Pending)"))
        assertTrue(body.contains("Manicure"))
        assertTrue(!body.contains("Massage"))
        assertTrue(!body.contains("Ana"))
        assertTrue(!body.contains("@example.com"))
    }

    @Test
    fun `each admin's token is independent - regenerate and revoke only ever affect the caller`() {
        val adminToken = tokenFrom(regenerateAndGetUrl(adminJwt()))
        val admin2Token = tokenFrom(regenerateAndGetUrl(admin2Jwt()))
        assertNotEquals(adminToken, admin2Token)

        // admin regenerates: admin2's link and status must be untouched.
        val adminSecondToken = tokenFrom(regenerateAndGetUrl(adminJwt()))
        assertNotEquals(adminToken, adminSecondToken)
        mockMvc.perform(get("/api/calendar-feed/$admin2Token.ics")).andExpect(status().isOk)
        mockMvc.perform(get("/api/admin/calendar-feed").with(admin2Jwt()))
            .andExpect(jsonPath("$.active").value(true))

        // admin2 revokes: admin's (regenerated) link and status must be untouched.
        mockMvc.perform(delete("/api/admin/calendar-feed").with(admin2Jwt())).andExpect(status().isNoContent)
        mockMvc.perform(get("/api/calendar-feed/$admin2Token.ics")).andExpect(status().isNotFound)
        mockMvc.perform(get("/api/calendar-feed/$adminSecondToken.ics")).andExpect(status().isOk)
        mockMvc.perform(get("/api/admin/calendar-feed").with(adminJwt()))
            .andExpect(jsonPath("$.active").value(true))
    }

    @Test
    fun `a deactivated admin's existing feed link stops working and their own endpoints 401`() {
        val token = tokenFrom(regenerateAndGetUrl(adminJwt()))
        mockMvc.perform(get("/api/calendar-feed/$token.ics")).andExpect(status().isOk)

        dsl.execute("update admin_users set active = false where email = 'admin@by-iara.local'")

        mockMvc.perform(get("/api/calendar-feed/$token.ics")).andExpect(status().isNotFound)
        mockMvc.perform(get("/api/admin/calendar-feed").with(adminJwt())).andExpect(status().isUnauthorized)
        mockMvc.perform(post("/api/admin/calendar-feed").with(adminJwt())).andExpect(status().isUnauthorized)
        mockMvc.perform(delete("/api/admin/calendar-feed").with(adminJwt())).andExpect(status().isUnauthorized)
    }

    @Test
    fun `a jwt whose email matches no admin account is unauthorized`() {
        val unknownAdminJwt = jwt().jwt { it.claim("email", "ghost@by-iara.local").claim("role", "ADMIN") }

        mockMvc.perform(get("/api/admin/calendar-feed").with(unknownAdminJwt)).andExpect(status().isUnauthorized)
    }
}
