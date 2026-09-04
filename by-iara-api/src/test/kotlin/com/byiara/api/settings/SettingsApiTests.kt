package com.byiara.api.settings

import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SettingsApiTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    @BeforeEach
    fun resetSettings() {
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
            "insert into application_settings (setting_key, setting_value) values ('appointment_buffer_minutes', '15')",
        )
        dsl.execute(
            "insert into application_settings (setting_key, setting_value) values ('max_daily_bookings', '3')",
        )
    }

    @Test
    fun `admin can read and update operational settings`() {
        mockMvc.perform(get("/api/admin/settings").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.appointmentBufferMinutes").value(15))
            .andExpect(jsonPath("$.maxDailyBookings").value(3))

        mockMvc.perform(
            put("/api/admin/settings")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"appointmentBufferMinutes":25,"maxDailyBookings":5}"""),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.appointmentBufferMinutes").value(25))
            .andExpect(jsonPath("$.maxDailyBookings").value(5))

        mockMvc.perform(get("/api/admin/settings").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.appointmentBufferMinutes").value(25))
            .andExpect(jsonPath("$.maxDailyBookings").value(5))
    }

    @Test
    fun `admin can remove the daily booking limit`() {
        mockMvc.perform(
            put("/api/admin/settings")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"appointmentBufferMinutes":15,"maxDailyBookings":null}"""),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.maxDailyBookings").doesNotExist())

        mockMvc.perform(get("/api/admin/settings").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.maxDailyBookings").doesNotExist())
    }

    @Test
    fun `settings reject a daily booking limit below one`() {
        mockMvc.perform(
            put("/api/admin/settings")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"appointmentBufferMinutes":15,"maxDailyBookings":0}"""),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `settings reject an appointment buffer outside the supported range`() {
        mockMvc.perform(
            put("/api/admin/settings")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"appointmentBufferMinutes":181,"maxDailyBookings":3}"""),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `settings reject an appointment buffer outside five minute increments`() {
        mockMvc.perform(
            put("/api/admin/settings")
                .with(adminJwt())
                .contentType("application/json")
                .content("""{"appointmentBufferMinutes":12,"maxDailyBookings":3}"""),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `settings require admin authentication`() {
        mockMvc.perform(get("/api/admin/settings")).andExpect(status().isUnauthorized)
    }

    private fun adminJwt() =
        jwt().jwt { it.claim("email", "admin@by-iara.local").claim("role", "ADMIN") }
}
