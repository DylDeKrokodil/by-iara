package com.byiara.api.catalog

import com.jayway.jsonpath.JsonPath
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.mock.web.MockMultipartFile
import java.awt.Color
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CatalogApiTests {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    @BeforeEach
    fun resetSchema() {
        // Other test classes (reservation/notification) share this H2 instance and may leave
        // reservations/email_logs behind, referencing services/service_variants via FK -- drop
        // them first (children before parents) or the drops below fail depending on run order.
        dsl.execute("drop table if exists email_logs")
        dsl.execute("drop table if exists reservations")
        dsl.execute("drop table if exists service_faqs")
        dsl.execute("drop table if exists service_images")
        dsl.execute("drop table if exists service_translations")
        dsl.execute("drop table if exists pack_offers")
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
                updated_at timestamp with time zone not null default now(),
                constraint service_variants_service_duration_unique unique (service_id, duration_minutes)
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
    fun `admin can upload an optimized service image and public clients can fetch it`() {
        val created = mockMvc.perform(
            post("/api/admin/services").with(adminJwt())
                .contentType("application/json")
                .content("""{"name":"Image service","variants":[{"durationMinutes":60,"priceCents":7000}]}"""),
        ).andExpect(status().isCreated).andReturn()
        val serviceId: String = JsonPath.read(created.response.contentAsString, "$.id")

        val source = BufferedImage(2000, 1500, BufferedImage.TYPE_INT_RGB).apply {
            createGraphics().run {
                color = Color(180, 80, 100)
                fillRect(0, 0, width, height)
                dispose()
            }
        }
        val bytes = ByteArrayOutputStream().also { ImageIO.write(source, "png", it) }.toByteArray()
        val file = MockMultipartFile("image", "service.png", "image/png", bytes)

        mockMvc.perform(
            multipart("/api/admin/services/$serviceId/image")
                .file(file)
                .with { request -> request.method = "PUT"; request }
                .with(adminJwt()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.image.width").value(1600))
            .andExpect(jsonPath("$.image.height").value(1200))
            .andExpect(jsonPath("$.image.url").value(org.hamcrest.Matchers.containsString("/api/services/$serviceId/image?v=")))

        mockMvc.perform(get("/api/services/$serviceId/image"))
            .andExpect(status().isOk)
            .andExpect { result -> check(result.response.contentType == "image/jpeg") }
            .andExpect { result -> check(result.response.contentAsByteArray.size < 1_000_000) }

        mockMvc.perform(delete("/api/admin/services/$serviceId/image").with(adminJwt()))
            .andExpect(status().isNoContent)
        mockMvc.perform(get("/api/admin/services/$serviceId").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.image").doesNotExist())
        mockMvc.perform(get("/api/services/$serviceId/image"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `creating a service stores localized pt and en content`() {
        mockMvc.perform(
            post("/api/admin/services").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "name": "Massagem relaxante",
                      "description": "Pressao suave para relaxamento",
                      "translations": {
                        "pt-PT": {
                          "name": "Massagem relaxante",
                          "description": "Pressao suave para relaxamento",
                          "treatmentDescription": "Movimentos lentos e continuos.",
                          "suitableFor": "Pessoas com stress e cansaco.",
                          "sessionDescription": "A sessao comeca com uma conversa.",
                          "faqs": [
                            {
                              "question": "Preciso de levar alguma coisa?",
                              "answer": "Nao, o material e fornecido."
                            }
                          ]
                        },
                        "en-US": {
                          "name": "Relaxing massage",
                          "description": "Gentle pressure for relaxation",
                          "treatmentDescription": "Slow and flowing movements.",
                          "suitableFor": "People experiencing stress or tiredness.",
                          "sessionDescription": "The session starts with a conversation.",
                          "faqs": [
                            {
                              "question": "Do I need to bring anything?",
                              "answer": "No, everything is provided."
                            }
                          ]
                        }
                      },
                      "variants": [
                        { "durationMinutes": 60, "priceCents": 7500 }
                      ]
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("Massagem relaxante"))
            .andExpect(jsonPath("$.translations['pt-PT'].slug").value("massagem-relaxante"))
            .andExpect(jsonPath("$.translations['pt-PT'].name").value("Massagem relaxante"))
            .andExpect(jsonPath("$.translations['en-US'].slug").value("relaxing-massage"))
            .andExpect(jsonPath("$.translations['en-US'].name").value("Relaxing massage"))

        mockMvc.perform(get("/api/admin/services").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].translations['pt-PT'].description").value("Pressao suave para relaxamento"))
            .andExpect(jsonPath("$[0].translations['pt-PT'].treatmentDescription").value("Movimentos lentos e continuos."))
            .andExpect(jsonPath("$[0].translations['pt-PT'].faqs[0].question").value("Preciso de levar alguma coisa?"))
            .andExpect(jsonPath("$[0].translations['en-US'].description").value("Gentle pressure for relaxation"))
            .andExpect(jsonPath("$[0].translations['en-US'].sessionDescription").value("The session starts with a conversation."))
            .andExpect(jsonPath("$[0].translations['en-US'].faqs[0].answer").value("No, everything is provided."))

        mockMvc.perform(get("/api/services/pt-PT/massagem-relaxante"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.translations['pt-PT'].name").value("Massagem relaxante"))

        mockMvc.perform(get("/api/services/en-US/relaxing-massage"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.translations['en-US'].name").value("Relaxing massage"))

        mockMvc.perform(get("/api/services/en-US/massagem-relaxante"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `updating a service can change both localized slugs`() {
        val created = mockMvc.perform(
            post("/api/admin/services").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "name": "Massagem relaxante",
                      "translations": {
                        "pt-PT": { "name": "Massagem relaxante" },
                        "en-US": { "name": "Relaxing massage" }
                      },
                      "variants": [
                        { "durationMinutes": 60, "priceCents": 7500 }
                      ]
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isCreated)
            .andReturn()

        val serviceId: String = JsonPath.read(created.response.contentAsString, "$.id")

        mockMvc.perform(
            put("/api/admin/services/$serviceId").with(adminJwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "name": "Massagem relaxante",
                      "translations": {
                        "pt-PT": {
                          "slug": "massagem-personalizada",
                          "name": "Massagem relaxante"
                        },
                        "en-US": {
                          "slug": "custom-relaxing-massage",
                          "name": "Relaxing massage"
                        }
                      },
                      "variants": [
                        { "durationMinutes": 60, "priceCents": 7500 }
                      ]
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.translations['pt-PT'].slug").value("massagem-personalizada"))
            .andExpect(jsonPath("$.translations['en-US'].slug").value("custom-relaxing-massage"))

        mockMvc.perform(get("/api/services/pt-PT/massagem-personalizada"))
            .andExpect(status().isOk)
        mockMvc.perform(get("/api/services/en-US/custom-relaxing-massage"))
            .andExpect(status().isOk)
        mockMvc.perform(get("/api/services/pt-PT/massagem-relaxante"))
            .andExpect(status().isNotFound)
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
    fun `admin can sort services by display order duration and price`() {
        createService("Premium", durationMinutes = 90, priceCents = 12_000, sortOrder = 2)
        createService("Express", durationMinutes = 30, priceCents = 4_000, sortOrder = 1)
        createService("Standard", durationMinutes = 60, priceCents = 7_000, sortOrder = 0)

        mockMvc.perform(get("/api/admin/services").with(adminJwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].name").value("Standard"))
            .andExpect(jsonPath("$[1].name").value("Express"))
            .andExpect(jsonPath("$[2].name").value("Premium"))

        mockMvc.perform(
            get("/api/admin/services")
                .param("sort", "PRICE")
                .param("direction", "ASC")
                .with(adminJwt()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].name").value("Express"))
            .andExpect(jsonPath("$[1].name").value("Standard"))
            .andExpect(jsonPath("$[2].name").value("Premium"))

        mockMvc.perform(
            get("/api/admin/services")
                .param("sort", "DURATION")
                .param("direction", "DESC")
                .with(adminJwt()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].name").value("Premium"))
            .andExpect(jsonPath("$[1].name").value("Standard"))
            .andExpect(jsonPath("$[2].name").value("Express"))
    }

    @Test
    fun `admin service search and status filters are applied by the backend`() {
        createService(
            name = "Massagem profunda",
            englishName = "Deep tissue massage",
            durationMinutes = 60,
            priceCents = 7_500,
        )
        createService(
            name = "Sazonal",
            durationMinutes = 45,
            priceCents = 6_000,
            active = false,
        )

        mockMvc.perform(
            get("/api/admin/services")
                .param("q", "DEEP")
                .param("active", "true")
                .with(adminJwt()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Massagem profunda"))

        mockMvc.perform(
            get("/api/admin/services")
                .param("active", "false")
                .with(adminJwt()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Sazonal"))
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

    private fun createService(
        name: String,
        durationMinutes: Int,
        priceCents: Long,
        sortOrder: Int = 0,
        active: Boolean = true,
        englishName: String? = null,
    ) {
        val englishTranslation = englishName?.let {
            ",\"en-US\":{\"name\":\"$it\"}"
        }.orEmpty()
        mockMvc.perform(
            post("/api/admin/services").with(adminJwt())
                .contentType("application/json")
                .content(
                    """{
                      "name":"$name",
                      "active":$active,
                      "sortOrder":$sortOrder,
                      "translations":{"pt-PT":{"name":"$name"}$englishTranslation},
                      "variants":[{"durationMinutes":$durationMinutes,"priceCents":$priceCents}]
                    }""".trimIndent(),
                ),
        ).andExpect(status().isCreated)
    }
}
