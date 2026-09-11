package com.byiara.api.popup

import com.byiara.api.popup.application.PopupService
import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PopupApiTests {
    @Autowired private lateinit var mvc: MockMvc
    @Autowired private lateinit var dsl: DSLContext
    @Autowired private lateinit var service: PopupService
    private val first = UUID.randomUUID()
    private val second = UUID.randomUUID()
    private val content = """{"name":"Welcome","titlePt":"Olá","titleEn":"Hello","bodyPt":"Uma novidade","bodyEn":"Some news","action":"book"}"""

    @BeforeEach
    fun setup() {
        dsl.execute("DROP TABLE IF EXISTS website_popup_publication")
        dsl.execute("DROP TABLE IF EXISTS website_popups")
        val migration = javaClass.getResource("/db/migration/V039__create_website_popups.sql")!!.readText()
        migration.split(";").filter { it.isNotBlank() }.forEach { dsl.execute(it) }
        listOf(first, second).forEach { id ->
            dsl.execute("INSERT INTO website_popups (id, name, title_pt, title_en, body_pt, body_en, action) VALUES (?, 'Welcome', 'Olá', 'Hello', 'Uma novidade', 'Some news', 'book')", id)
        }
    }

    @Test
    fun `publication replaces the active popup and stale disabling does not disable its replacement`() {
        activate(first, true)
        activate(second, true)
        activate(first, false)
        mvc.perform(get("/api/popups/active")).andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(second.toString()))
            .andExpect(jsonPath("$.name").doesNotExist())
            .andExpect(header().string("Cache-Control", "no-store"))
        assertEquals(1, service.list().count { it.active })
        activate(second, false)
        mvc.perform(get("/api/popups/active")).andExpect(status().isNoContent)
    }

    @Test
    fun `concurrent activation leaves exactly one active popup`() {
        val start = CountDownLatch(1)
        val workers = Executors.newFixedThreadPool(2)
        try {
            val results = listOf(first, second).map { id -> workers.submit { start.await(); service.setActive(id, true) } }
            start.countDown()
            results.forEach { it.get(10, TimeUnit.SECONDS) }
            assertEquals(1, service.list().count { it.active })
            assertTrue(service.active()!!.id in listOf(first, second))
        } finally { workers.shutdownNow() }
    }

    @Test
    fun `create is disabled and editing does not change publication state`() {
        mvc.perform(post("/api/admin/popups").with(jwt()).contentType("application/json").content(content))
            .andExpect(status().isCreated).andExpect(jsonPath("$.active").value(false))
        activate(first, true)
        mvc.perform(put("/api/admin/popups/$first").with(jwt()).contentType("application/json").content(content))
            .andExpect(status().isOk).andExpect(jsonPath("$.active").value(true))
        mvc.perform(put("/api/admin/popups/$second").with(jwt()).contentType("application/json").content(content))
            .andExpect(status().isOk).andExpect(jsonPath("$.active").value(false))
    }

    @Test
    fun `reject invalid content and missing popups without disturbing publication`() {
        activate(first, true)
        for (invalid in listOf(content.replace("Hello", " "), content.replace("Some news", "x".repeat(241)), content.replace("book", "javascript:alert(1)"))) {
            mvc.perform(post("/api/admin/popups").with(jwt()).contentType("application/json").content(invalid)).andExpect(status().isBadRequest)
        }
        mvc.perform(put("/api/admin/popups/${UUID.randomUUID()}/active").with(jwt()).contentType("application/json").content("""{"active":true}""")).andExpect(status().isNotFound)
        assertEquals(first, service.active()!!.id)
    }

    @Test
    fun `admin endpoints require authentication`() {
        mvc.perform(get("/api/admin/popups")).andExpect(status().isUnauthorized)
        mvc.perform(post("/api/admin/popups").contentType("application/json").content(content)).andExpect(status().isUnauthorized)
        mvc.perform(put("/api/admin/popups/$first/active").contentType("application/json").content("""{"active":true}""")).andExpect(status().isUnauthorized)
    }

    private fun activate(id: UUID, active: Boolean) {
        mvc.perform(put("/api/admin/popups/$id/active").with(jwt()).contentType("application/json").content("""{"active":$active}""")).andExpect(status().isNoContent)
    }
}
