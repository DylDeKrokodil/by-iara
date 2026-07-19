package com.byiara.api.finance

import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class FinanceApiTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    private val now = OffsetDateTime.now(ZoneOffset.UTC).withNano(0)
    private val from = now.minusDays(3)
    private val to = now.plusDays(1)

    @BeforeEach
    fun resetSchema() {
        dsl.execute("drop table if exists expenses")
        dsl.execute("drop table if exists reservation_payments")
        dsl.execute("drop table if exists reservations")
        dsl.execute("drop table if exists customers")

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
                currency varchar(3) not null,
                starts_at timestamp with time zone not null,
                ends_at timestamp with time zone not null,
                status varchar(20) not null,
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
            create table expenses (
                id uuid default random_uuid() primary key,
                category varchar(40) not null,
                amount_cents bigint not null,
                currency varchar(3) not null,
                incurred_at timestamp with time zone not null,
                vendor varchar(160),
                description varchar(500) not null,
                status varchar(20) not null default 'ACTIVE',
                voided_at timestamp with time zone,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
    }

    @Test
    fun `financial report uses paid revenue active expenses and appointment outcomes`() {
        val completedId = insertReservation("COMPLETED", 10_000, now.minusDays(1))
        insertReservation("NO_SHOW", 7_500, now.minusDays(2))
        dsl.query(
            "insert into reservation_payments (reservation_id, amount_cents, currency, method, paid_at) values (?, ?, ?, ?, ?)",
            completedId,
            8_000,
            "EUR",
            "CARD",
            now.minusHours(12),
        ).execute()
        insertExpense(2_000)

        mockMvc.perform(
            get("/api/admin/finance/report")
                .with(adminJwt())
                .param("from", from.toString())
                .param("to", to.toString())
                .param("currency", "EUR"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.revenueCents").value(8_000))
            .andExpect(jsonPath("$.expenseCents").value(2_000))
            .andExpect(jsonPath("$.operatingProfitCents").value(6_000))
            .andExpect(jsonPath("$.outstandingBalanceCents").value(2_000))
            .andExpect(jsonPath("$.completedAppointments").value(1))
            .andExpect(jsonPath("$.noShows").value(1))
            .andExpect(jsonPath("$.averageCompletedValueCents").value(10_000))
            .andExpect(jsonPath("$.revenueByPaymentMethod[0].method").value("CARD"))
            .andExpect(jsonPath("$.trend[0].profitCents").exists())
    }

    @Test
    fun `expense entries can be created listed and voided without deleting the audit record`() {
        val response = mockMvc.perform(
            post("/api/admin/finance/expenses")
                .with(adminJwt())
                .contentType("application/json")
                .content(
                    """{
                        "category":"SUPPLIES",
                        "amountCents":1250,
                        "currency":"EUR",
                        "incurredAt":"${now.minusHours(2)}",
                        "vendor":"Wellness Supply",
                        "description":"Massage oil"
                    }""".trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.status").value("ACTIVE"))
            .andReturn()
        val expenseId = Regex("\"id\":\"([^\"]+)\"")
            .find(response.response.contentAsString)!!.groupValues[1]

        mockMvc.perform(
            get("/api/admin/finance/expenses")
                .with(adminJwt())
                .param("from", from.toString())
                .param("to", to.toString()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].description").value("Massage oil"))

        mockMvc.perform(patch("/api/admin/finance/expenses/$expenseId/void").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("VOIDED"))

        mockMvc.perform(
            get("/api/admin/finance/report")
                .with(adminJwt())
                .param("from", from.toString())
                .param("to", to.toString()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.expenseCents").value(0))
    }

    @Test
    fun `paid income can be listed with reservation context`() {
        val reservationId = insertReservation("COMPLETED", 10_000, now.minusDays(1))
        dsl.query(
            "insert into reservation_payments (reservation_id, amount_cents, currency, method, paid_at) values (?, ?, ?, ?, ?)",
            reservationId,
            8_000,
            "EUR",
            "CARD",
            now.minusHours(12),
        ).execute()

        mockMvc.perform(
            get("/api/admin/finance/payments")
                .with(adminJwt())
                .param("from", from.toString())
                .param("to", to.toString())
                .param("currency", "EUR"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].reservationId").value(reservationId.toString()))
            .andExpect(jsonPath("$.items[0].customerName").value("Finance Test"))
            .andExpect(jsonPath("$.items[0].serviceName").value("Massage"))
            .andExpect(jsonPath("$.items[0].method").value("CARD"))
            .andExpect(jsonPath("$.items[0].amountCents").value(8_000))
    }

    @Test
    fun `finance endpoints require authentication`() {
        mockMvc.perform(
            get("/api/admin/finance/report")
                .param("from", from.toString())
                .param("to", to.toString()),
        ).andExpect(status().isUnauthorized)
    }

    private fun insertReservation(status: String, priceCents: Long, start: OffsetDateTime): UUID {
        val customerId = UUID.randomUUID()
        val reservationId = UUID.randomUUID()
        dsl.query(
            "insert into customers (id, name, email) values (?, ?, ?)",
            customerId,
            "Finance Test",
            "$customerId@example.com",
        ).execute()
        dsl.query(
            """
            insert into reservations (
                id, customer_id, service_name, duration_minutes, price_cents,
                currency, starts_at, ends_at, status
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            reservationId,
            customerId,
            "Massage",
            60,
            priceCents,
            "EUR",
            start,
            start.plusHours(1),
            status,
        ).execute()
        return reservationId
    }

    private fun insertExpense(amountCents: Long) {
        dsl.query(
            """
            insert into expenses (category, amount_cents, currency, incurred_at, description)
            values (?, ?, ?, ?, ?)
            """.trimIndent(),
            "SOFTWARE",
            amountCents,
            "EUR",
            now.minusHours(6),
            "Booking software",
        ).execute()
    }

    private fun adminJwt(): RequestPostProcessor =
        jwt().jwt { it.claim("email", "admin@by-iara.local").claim("role", "ADMIN") }
}
