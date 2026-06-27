package com.byiara.api.catalog

import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CatalogApiTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    @BeforeEach
    fun resetSchema() {
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
                updated_at timestamp with time zone not null default now(),
                constraint service_variants_service_duration_unique unique (service_id, duration_minutes)
            )
            """.trimIndent(),
        )
    }

    private fun adminJwt(): RequestPostProcessor =
        jwt().jwt {
            it.claim("email", "admin@by-iara.local").claim("role", "ADMIN")
        }

    @Test
    fun `creating a service exposes it in the public catalog with its variants`() {
        mockMvc.perform(
            post("/api/admin/services").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "name": "Deep tissue",
                      "description": "Firm, focused pressure",
                      "variants": [
                        { "durationMinutes": 30, "priceCents": 4500 },
                        { "durationMinutes": 60, "priceCents": 7500 }
                      ]
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.slug").value("deep-tissue"))
            .andExpect(jsonPath("$.variants.length()").value(2))
            .andExpect(jsonPath("$.variants[0].price.amountCents").value(4500))
            .andExpect(jsonPath("$.variants[0].price.currency").value("EUR"))

        mockMvc.perform(get("/api/services"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Deep tissue"))
            .andExpect(jsonPath("$[0].variants.length()").value(2))
    }

    @Test
    fun `public catalog hides inactive services`() {
        mockMvc.perform(
            post("/api/admin/services").with(adminJwt())
                .contentType("application/json")
                .content(
                    """{"name":"Seasonal","active":false,"variants":[{"durationMinutes":45,"priceCents":6000}]}""",
                ),
        ).andExpect(status().isCreated)

        mockMvc.perform(get("/api/services"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))
    }

    @Test
    fun `admin service routes require authentication`() {
        mockMvc.perform(get("/api/admin/services"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `fetching an unknown service returns 404`() {
        mockMvc.perform(
            get("/api/admin/services/00000000-0000-0000-0000-000000000000").with(adminJwt()),
        )
            .andExpect(status().isNotFound)
    }
}
