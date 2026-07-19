package com.byiara.api.availability

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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate
import java.time.OffsetDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AvailabilityApiTests {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    @BeforeEach
    fun resetSchema() {
        dsl.execute("drop table if exists availability_rules")
        dsl.execute("drop table if exists availability_blocks")
        dsl.execute(
            """
            create table availability_rules (
                id uuid default random_uuid() primary key,
                day_of_week integer not null,
                start_time time not null,
                end_time time not null,
                constraint availability_rules_unique_shift unique (day_of_week, start_time, end_time)
            )
            """.trimIndent()
        )
        dsl.execute(
            """
            create table availability_blocks (
                id uuid default random_uuid() primary key,
                start_time timestamp with time zone not null,
                end_time timestamp with time zone not null,
                reason varchar(255)
            )
            """.trimIndent()
        )
    }

    private fun adminJwt(): RequestPostProcessor =
        jwt().jwt {
            it.claim("email", "admin@by-iara.local").claim("role", "ADMIN")
        }

    @Test
    fun `admin can manage weekly availability rules`() {
        // 1. Create rule
        mockMvc.perform(
            post("/api/admin/availability/rules").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "dayOfWeek": "MONDAY",
                      "startTime": "09:00:00",
                      "endTime": "17:00:00"
                    }
                    """.trimIndent()
                )
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.dayOfWeek").value("MONDAY"))
            .andExpect(jsonPath("$.startTime").value("09:00:00"))
            .andExpect(jsonPath("$.endTime").value("17:00:00"))
            .andExpect(jsonPath("$.id").exists())

        // 2. List rules
        mockMvc.perform(
            get("/api/admin/availability/rules").with(adminJwt())
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].dayOfWeek").value("MONDAY"))
    }

    @Test
    fun `admin can manage availability blocks`() {
        val start = OffsetDateTime.now().plusDays(1)
        val end = start.plusHours(2)

        // 1. Create block
        mockMvc.perform(
            post("/api/admin/availability/blocks").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "startTime": "$start",
                      "endTime": "$end",
                      "reason": "Lunch break"
                    }
                    """.trimIndent()
                )
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.reason").value("Lunch break"))
            .andExpect(jsonPath("$.id").exists())

        // 2. List blocks
        mockMvc.perform(
            get("/api/admin/availability/blocks").with(adminJwt())
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
    }

    @Test
    fun `public availability computes slots correctly`() {
        // Monday next week
        val nextMonday = LocalDate.now().plusWeeks(1).with(java.time.DayOfWeek.MONDAY)

        // Create rule for Mondays 09:00 to 12:00
        mockMvc.perform(
            post("/api/admin/availability/rules").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "dayOfWeek": "MONDAY",
                      "startTime": "09:00:00",
                      "endTime": "12:00:00"
                    }
                    """.trimIndent()
                )
        ).andExpect(status().isCreated)

        // Query public slots for that Monday (duration 60 minutes)
        // Expected slots (assuming 15 minute start increments):
        // Slot 1: 09:00 - 10:00
        // Slot 2: 09:15 - 10:15
        // Slot 3: 09:30 - 10:30
        // Slot 4: 09:45 - 10:45
        // Slot 5: 10:00 - 11:00
        // Slot 6: 10:15 - 11:15
        // Slot 7: 10:30 - 11:30
        // Slot 8: 10:45 - 11:45
        // Slot 9: 11:00 - 12:00
        mockMvc.perform(
            get("/api/availability")
                .param("startDate", nextMonday.toString())
                .param("endDate", nextMonday.toString())
                .param("durationMinutes", "60")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(9))
            .andExpect(jsonPath("$[0]").value(org.hamcrest.Matchers.containsString("09:00")))
            .andExpect(jsonPath("$[8]").value(org.hamcrest.Matchers.containsString("11:00")))

        // Add a block on Monday from 10:00 to 11:00
        // Blocks:
        // Slot 1 (09:00 - 10:00) -> start: 09:00, end: 10:00. Does it overlap? slot.start < block.end (09:00 < 11:00) and slot.end > block.start (10:00 > 10:00 is FALSE). No overlap!
        // Slot 2 (09:30 - 10:30) -> start: 09:30, end: 10:30. Overlaps! (09:30 < 11:00 and 10:30 > 10:00 is TRUE).
        // Slot 3 (10:00 - 11:00) -> Overlaps!
        // Slot 4 (10:30 - 11:30) -> Overlaps!
        // Slot 5 (11:00 - 12:00) -> No overlap (11:00 < 11:00 is FALSE).
        // Remaining slots should be: 09:00 and 11:00.
        val blockStart = nextMonday.atTime(10, 0).atZone(java.time.ZoneId.of("Europe/Brussels")).toOffsetDateTime()
        val blockEnd = nextMonday.atTime(11, 0).atZone(java.time.ZoneId.of("Europe/Brussels")).toOffsetDateTime()

        mockMvc.perform(
            post("/api/admin/availability/blocks").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "startTime": "$blockStart",
                      "endTime": "$blockEnd",
                      "reason": "Doctor appointment"
                    }
                    """.trimIndent()
                )
        ).andExpect(status().isCreated)

        // Query again, expecting only 2 slots: 09:00 and 11:00 (local time)
        mockMvc.perform(
            get("/api/availability")
                .param("startDate", nextMonday.toString())
                .param("endDate", nextMonday.toString())
                .param("durationMinutes", "60")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0]").value(org.hamcrest.Matchers.containsString("09:00")))
            .andExpect(jsonPath("$[1]").value(org.hamcrest.Matchers.containsString("11:00")))
    }

    @Test
    fun `a rule ending near midnight does not hang when duration would cross into the next day`() {
        val nextMonday = LocalDate.now().plusWeeks(1).with(java.time.DayOfWeek.MONDAY)

        // A 60-minute appointment cannot fit between 23:00 and 23:45, so the last
        // candidate must be 22:45-23:45. Regression test for a bug where LocalTime
        // wraparound past midnight made the generator loop forever.
        mockMvc.perform(
            post("/api/admin/availability/rules").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "dayOfWeek": "MONDAY",
                      "startTime": "22:00:00",
                      "endTime": "23:45:00"
                    }
                    """.trimIndent(),
                ),
        ).andExpect(status().isCreated)

        mockMvc.perform(
            get("/api/availability")
                .param("startDate", nextMonday.toString())
                .param("endDate", nextMonday.toString())
                .param("durationMinutes", "60"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[3]").value(org.hamcrest.Matchers.containsString("22:45")))
    }

    @Test
    fun `unauthenticated requests to admin are blocked`() {
        mockMvc.perform(get("/api/admin/availability/rules"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `admin cannot create overlapping or duplicate rules`() {
        // 1. Create initial rule (Monday 09:00 to 17:00)
        mockMvc.perform(
            post("/api/admin/availability/rules").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "dayOfWeek": "MONDAY",
                      "startTime": "09:00:00",
                      "endTime": "17:00:00"
                    }
                    """.trimIndent()
                )
        ).andExpect(status().isCreated)

        // 2. Try creating overlapping rule (Monday 10:00 to 14:00) -> should be rejected with 400 Bad Request
        mockMvc.perform(
            post("/api/admin/availability/rules").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "dayOfWeek": "MONDAY",
                      "startTime": "10:00:00",
                      "endTime": "14:00:00"
                    }
                    """.trimIndent()
                )
        ).andExpect(status().isBadRequest)

        // 3. Try creating identical duplicate rule (Monday 09:00 to 17:00) -> should be rejected with 400 Bad Request
        mockMvc.perform(
            post("/api/admin/availability/rules").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "dayOfWeek": "MONDAY",
                      "startTime": "09:00:00",
                      "endTime": "17:00:00"
                    }
                    """.trimIndent()
                )
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `creating a rule with invalid enum format returns ApiErrorResponse`() {
        mockMvc.perform(
            post("/api/admin/availability/rules").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "dayOfWeek": "MONDAYY",
                      "startTime": "09:00:00",
                      "endTime": "17:00:00"
                    }
                    """.trimIndent()
                )
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Accepted values are")))
    }
}
