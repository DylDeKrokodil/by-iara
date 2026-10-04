package com.byiara.api.guide

import com.jayway.jsonpath.JsonPath
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.mock.web.MockMultipartFile
import java.util.Base64

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GuideApiTests {
    @Autowired private lateinit var mockMvc: MockMvc
    @Autowired private lateinit var dsl: DSLContext

    @BeforeEach
    fun resetSchema() {
        listOf(
            "guide_content_images",
            "guide_images",
            "service_images",
            "media_assets",
            "guide_related_services",
            "guide_tags",
            "guide_categories",
            "guide_faqs",
            "guide_block_items",
            "guide_blocks",
            "guide_translations",
            "guides",
            "services",
        ).forEach { dsl.execute("drop table if exists $it") }

        dsl.execute(
            """
            create table services (
                id uuid primary key,
                name varchar(160) not null
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table guides (
                id uuid primary key,
                status varchar(20) not null,
                author varchar(160) not null,
                published_at timestamp with time zone,
                created_at timestamp with time zone not null default now(),
                updated_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table guide_translations (
                guide_id uuid not null references guides(id) on delete cascade,
                locale varchar(10) not null,
                slug varchar(140) not null,
                title varchar(180) not null,
                excerpt text not null,
                seo_title varchar(180) not null,
                meta_description varchar(320) not null,
                primary key (guide_id, locale),
                unique (locale, slug)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table guide_blocks (
                id uuid primary key,
                guide_id uuid not null,
                locale varchar(10) not null,
                block_type varchar(30) not null,
                sort_order integer not null,
                text_content text,
                heading_level integer,
                image_url varchar(1000),
                image_alt varchar(300),
                action_label varchar(160),
                action_url varchar(1000),
                foreign key (guide_id, locale) references guide_translations(guide_id, locale) on delete cascade
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table guide_block_items (
                block_id uuid not null references guide_blocks(id) on delete cascade,
                sort_order integer not null,
                text_content text not null,
                primary key (block_id, sort_order)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table guide_faqs (
                id uuid default random_uuid() primary key,
                guide_id uuid not null,
                locale varchar(10) not null,
                question text not null,
                answer text not null,
                sort_order integer not null,
                foreign key (guide_id, locale) references guide_translations(guide_id, locale) on delete cascade
            )
            """.trimIndent(),
        )
        dsl.execute("create table guide_categories (guide_id uuid not null references guides(id) on delete cascade, name varchar(100) not null, primary key (guide_id, name))")
        dsl.execute("create table guide_tags (guide_id uuid not null references guides(id) on delete cascade, name varchar(100) not null, primary key (guide_id, name))")
        dsl.execute("create table guide_related_services (guide_id uuid not null references guides(id) on delete cascade, service_id uuid not null references services(id), sort_order integer not null, primary key (guide_id, service_id))")
        dsl.execute(
            """
            create table media_assets (
                id uuid primary key,
                content_hash varchar(64) not null unique,
                content_type varchar(32) not null,
                width integer not null,
                height integer not null,
                byte_size integer not null,
                storage_key varchar(500) not null unique,
                created_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table service_images (
                service_id uuid primary key references services(id) on delete cascade,
                media_asset_id uuid not null references media_assets(id)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table guide_images (
                guide_id uuid not null references guides(id) on delete cascade,
                image_type varchar(20) not null,
                media_asset_id uuid not null references media_assets(id),
                content_type varchar(32) not null,
                width integer not null,
                height integer not null,
                byte_size integer not null,
                storage_key varchar(500) not null,
                updated_at timestamp with time zone not null default now(),
                primary key (guide_id, image_type)
            )
            """.trimIndent(),
        )
        dsl.execute(
            """
            create table guide_content_images (
                id uuid primary key,
                guide_id uuid not null references guides(id) on delete cascade,
                media_asset_id uuid not null references media_assets(id),
                content_type varchar(32) not null,
                width integer not null,
                height integer not null,
                byte_size integer not null,
                storage_key varchar(500) not null,
                content_hash varchar(64) not null,
                created_at timestamp with time zone not null default now()
            )
            """.trimIndent(),
        )
    }

    @Test
    fun `draft stays private until published and archive removes it again`() {
        val created = mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt().jwt { it.claim("email", "admin@by-iara.local").claim("role", "ADMIN") })
                .contentType("application/json")
                .content(validGuideJson),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$['translations']['pt-PT']['slug']").value("primeira-massagem"))
            .andReturn()
        val id: String = JsonPath.read(created.response.contentAsString, "$.id")

        mockMvc.perform(get("/api/guides/pt-PT"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))
        mockMvc.perform(get("/api/guides/availability"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").value(false))

        mockMvc.perform(
            put("/api/admin/guides/status")
                .with(jwt())
                .contentType("application/json")
                .content("""{"ids":["$id"],"status":"PUBLISHED"}"""),
        ).andExpect(status().isNoContent)

        mockMvc.perform(get("/api/guides/pt-PT/primeira-massagem"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$['translations']['pt-PT']['blocks'][0]['type']").value("PARAGRAPH"))
            .andExpect(jsonPath("$.publishedAt").isNotEmpty)
        mockMvc.perform(get("/api/guides/availability"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").value(true))

        mockMvc.perform(
            put("/api/admin/guides/status")
                .with(jwt())
                .contentType("application/json")
                .content("""{"ids":["$id"],"status":"ARCHIVED"}"""),
        ).andExpect(status().isNoContent)

        mockMvc.perform(get("/api/guides/pt-PT/primeira-massagem"))
            .andExpect(status().isNotFound)
        mockMvc.perform(get("/api/guides/availability"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").value(false))
    }

    @Test
    fun `a draft can be saved empty and cannot be published until complete`() {
        val created = mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content("""{"status":"DRAFT"}"""),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$['translations']['pt-PT']['title']").value(""))
            .andExpect(jsonPath("$['translations']['en-US']['title']").value(""))
            .andReturn()
        val id: String = JsonPath.read(created.response.contentAsString, "$.id")

        mockMvc.perform(
            put("/api/admin/guides/status")
                .with(jwt())
                .contentType("application/json")
                .content("""{"ids":["$id"],"status":"PUBLISHED"}"""),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value("Enter an author before publishing"))

        mockMvc.perform(
            put("/api/admin/guides/$id")
                .with(jwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "status":"DRAFT",
                      "translations":{
                        "pt-PT":{
                          "title":"###",
                          "blocks":[{"type":"IMAGE"}],
                          "faqs":[{"question":"Unanswered question"}]
                        }
                      }
                    }
                    """.trimIndent(),
                ),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$['translations']['pt-PT']['title']").value("###"))
            .andExpect(jsonPath("$['translations']['pt-PT']['blocks'][0]['type']").value("IMAGE"))
            .andExpect(jsonPath("$['translations']['pt-PT']['faqs'][0]['answer']").value(""))
            .andExpect(jsonPath("$['translations']['en-US']['title']").value(""))

        mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content(
                    """
                    {
                      "status":"PUBLISHED",
                      "author":"Iara",
                      "translations":{
                        "pt-PT":{
                          "title":"Guia",
                          "excerpt":"Resumo",
                          "seoTitle":"Guia em Almada",
                          "metaDescription":"Descrição do guia em Almada."
                        }
                      }
                    }
                    """.trimIndent(),
                ),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `draft titles do not need unique or short generated slugs`() {
        val draft = """{"status":"DRAFT","translations":{"pt-PT":{"title":"Same title"}}}"""
        val first = mockMvc.perform(
            post("/api/admin/guides").with(jwt()).contentType("application/json").content(draft),
        ).andExpect(status().isCreated).andReturn()
        val second = mockMvc.perform(
            post("/api/admin/guides").with(jwt()).contentType("application/json").content(draft),
        ).andExpect(status().isCreated).andReturn()
        val firstSlug: String = JsonPath.read(first.response.contentAsString, "$.translations['pt-PT'].slug")
        val secondSlug: String = JsonPath.read(second.response.contentAsString, "$.translations['pt-PT'].slug")
        kotlin.test.assertNotEquals(firstSlug, secondSlug)

        mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content("""{"status":"DRAFT","translations":{"pt-PT":{"title":"${"a".repeat(150)}"}}}"""),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$['translations']['pt-PT']['slug']").value(org.hamcrest.Matchers.startsWith("draft-")))
    }

    @Test
    fun `publishing reports when a generated slug is too long`() {
        val published = validGuideJson
            .replace("\"status\":\"DRAFT\"", "\"status\":\"PUBLISHED\"")
            .replace("\"title\":\"Primeira massagem\"", "\"title\":\"${"a".repeat(150)}\"")
        mockMvc.perform(
            post("/api/admin/guides").with(jwt()).contentType("application/json").content(published),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value("Portuguese URL slug must be 140 characters or fewer"))
    }

    @Test
    fun `translations keep independent text after update`() {
        val created = mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content(validGuideJson),
        ).andExpect(status().isCreated).andReturn()
        val id: String = JsonPath.read(created.response.contentAsString, "$.id")

        mockMvc.perform(get("/api/admin/guides/$id").with(jwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$['translations']['pt-PT']['title']").value("Primeira massagem"))
            .andExpect(jsonPath("$['translations']['en-US']['title']").value("Your first massage"))
            .andExpect(jsonPath("$['translations']['pt-PT']['excerpt']").value("O que esperar antes da sua primeira sessão."))
            .andExpect(jsonPath("$['translations']['en-US']['excerpt']").value("What to expect before your first session."))
            .andExpect(jsonPath("$['translations']['pt-PT']['seoTitle']").value("Primeira massagem em Almada"))
            .andExpect(jsonPath("$['translations']['en-US']['seoTitle']").value("Your first massage in Almada"))
    }

    @Test
    fun `publish errors name the exact language and field`() {
        val published = validGuideJson.replace("\"status\":\"DRAFT\"", "\"status\":\"PUBLISHED\"")
        val cases = listOf(
            Triple("\"author\":\"Iara Gouveia\"", "\"author\":\"\"", "Enter an author before publishing"),
            Triple("\"title\":\"Primeira massagem\"", "\"title\":\"\"", "Enter the Portuguese title"),
            Triple("\"excerpt\":\"O que esperar antes da sua primeira sessão.\"", "\"excerpt\":\"\"", "Enter the Portuguese summary"),
            Triple("\"seoTitle\":\"Primeira massagem em Almada\"", "\"seoTitle\":\"\"", "Enter the Portuguese SEO title"),
            Triple("\"metaDescription\":\"Saiba como preparar a sua primeira massagem em Almada.\"", "\"metaDescription\":\"\"", "Enter the Portuguese meta description"),
            Triple("\"text\":\"Chegue com alguns minutos de antecedência.\"", "\"text\":\"\"", "Portuguese content block 1: enter paragraph text"),
            Triple("\"answer\":\"Roupa confortável.\"", "\"answer\":\"\"", "Portuguese FAQ 1: enter an answer"),
            Triple("\"title\":\"Your first massage\"", "\"title\":\"\"", "Enter the English title"),
        )
        cases.forEach { (before, after, expected) ->
            check(before in published) { "Missing test field: $before" }
            mockMvc.perform(
                post("/api/admin/guides")
                    .with(jwt())
                    .contentType("application/json")
                    .content(published.replace(before, after)),
            )
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.message").value(expected))
        }
    }

    @Test
    fun `rich guide content keeps formatting per language and removes unsafe HTML`() {
        val rich = validGuideJson
            .replace(
                "{\"type\":\"PARAGRAPH\",\"text\":\"Chegue com alguns minutos de antecedência.\"}",
                "{\"type\":\"RICH_TEXT\",\"text\":\"<h2>Preparação</h2><ul><li>Chegue cedo</li></ul><img src='/api/guides/images/content/guide/image' alt='Relaxing room'><script>alert(1)</script>\"}",
            )
            .replace(
                "{\"type\":\"PARAGRAPH\",\"text\":\"Arrive a few minutes early.\"}",
                "{\"type\":\"RICH_TEXT\",\"text\":\"<h2>Getting ready</h2><ol><li>Arrive early</li></ol>\"}",
            )
            .replace("\"status\":\"DRAFT\"", "\"status\":\"PUBLISHED\"")

        val created = mockMvc.perform(
            post("/api/admin/guides").with(jwt()).contentType("application/json").content(rich),
        ).andExpect(status().isCreated)
            .andExpect(jsonPath("$['translations']['pt-PT']['blocks'][0]['type']").value("RICH_TEXT"))
            .andExpect(jsonPath("$['translations']['pt-PT']['blocks'][0]['text']").value(org.hamcrest.Matchers.containsString("<ul>")))
            .andExpect(jsonPath("$['translations']['pt-PT']['blocks'][0]['text']").value(org.hamcrest.Matchers.containsString("/api/guides/images/content/guide/image")))
            .andExpect(jsonPath("$['translations']['pt-PT']['blocks'][0]['text']").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("<script>"))))
            .andExpect(jsonPath("$['translations']['en-US']['blocks'][0]['text']").value(org.hamcrest.Matchers.containsString("Getting ready")))
            .andReturn()
        val id: String = JsonPath.read(created.response.contentAsString, "$.id")
        mockMvc.perform(get("/api/guides/pt-PT/primeira-massagem"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$['translations']['pt-PT']['blocks'][0]['type']").value("RICH_TEXT"))
        mockMvc.perform(get("/api/admin/guides/$id").with(jwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$['translations']['en-US']['blocks'][0]['text']").value(org.hamcrest.Matchers.containsString("<ol>")))
    }

    @Test
    fun `publishing an empty rich text editor names the content error`() {
        val published = validGuideJson
            .replace("\"status\":\"DRAFT\"", "\"status\":\"PUBLISHED\"")
            .replace(
                "{\"type\":\"PARAGRAPH\",\"text\":\"Chegue com alguns minutos de antecedência.\"}",
                "{\"type\":\"RICH_TEXT\",\"text\":\"<p><br></p>\"}",
            )
        mockMvc.perform(post("/api/admin/guides").with(jwt()).contentType("application/json").content(published))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value("Enter the Portuguese guide content"))
    }

    @Test
    fun `pasted data images report an actionable error instead of silently disappearing`() {
        val draft = validGuideJson.replace(
            "{\"type\":\"PARAGRAPH\",\"text\":\"Chegue com alguns minutos de antecedência.\"}",
            "{\"type\":\"RICH_TEXT\",\"text\":\"<p>Texto</p><img src='data:image/png;base64,abcd' alt='Room'>\"}",
        )
        mockMvc.perform(post("/api/admin/guides").with(jwt()).contentType("application/json").content(draft))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value("Guide images must use an HTTPS URL or the Upload or Library action"))
    }

    @Test
    fun `guide image can be inserted and replaced`() {
        val created = mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content(validGuideJson),
        ).andExpect(status().isCreated).andReturn()
        val id: String = JsonPath.read(created.response.contentAsString, "$.id")
        val image = MockMultipartFile("image", "cover.png", "image/png", onePixelPng)

        repeat(2) {
            mockMvc.perform(
                multipart("/api/admin/guides/$id/images/COVER")
                    .file(image)
                    .with(jwt())
                    .with { request -> request.apply { method = "PUT" } },
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.images.COVER.width").value(1))
                .andExpect(jsonPath("$.images.COVER.height").value(1))
        }
    }

    @Test
    fun `content image is uploadable by an admin and public only with its published guide`() {
        val created = mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content(validGuideJson),
        ).andExpect(status().isCreated).andReturn()
        val guideId: String = JsonPath.read(created.response.contentAsString, "$.id")
        val uploaded = mockMvc.perform(
            multipart("/api/admin/guides/$guideId/content-images")
                .file(MockMultipartFile("image", "content.png", "image/png", onePixelPng))
                .with(jwt()),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.width").value(1))
            .andExpect(jsonPath("$.height").value(1))
            .andExpect(jsonPath("$.url").isNotEmpty)
            .andReturn()
        val imageId: String = JsonPath.read(uploaded.response.contentAsString, "$.id")

        mockMvc.perform(get("/api/admin/guides/$guideId/content-images/$imageId").with(jwt()))
            .andExpect(status().isOk)
        mockMvc.perform(get("/api/guides/images/content/$guideId/$imageId"))
            .andExpect(status().isNotFound)

        mockMvc.perform(
            put("/api/admin/guides/status")
                .with(jwt())
                .contentType("application/json")
                .content("""{"ids":["$guideId"],"status":"PUBLISHED"}"""),
        ).andExpect(status().isNoContent)

        mockMvc.perform(get("/api/guides/images/content/$guideId/$imageId"))
            .andExpect(status().isOk)
    }

    @Test
    fun `invalid content image returns a useful message`() {
        val created = mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content(validGuideJson),
        ).andExpect(status().isCreated).andReturn()
        val guideId: String = JsonPath.read(created.response.contentAsString, "$.id")

        mockMvc.perform(
            multipart("/api/admin/guides/$guideId/content-images")
                .file(MockMultipartFile("image", "broken.png", "image/png", "not a PNG".toByteArray()))
                .with(jwt()),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value("Use a valid JPEG or PNG image"))
    }

    @Test
    fun `identical content images share one stored object until the last reference is deleted`() {
        val created = mockMvc.perform(
            post("/api/admin/guides")
                .with(jwt())
                .contentType("application/json")
                .content(validGuideJson),
        ).andExpect(status().isCreated).andReturn()
        val guideId: String = JsonPath.read(created.response.contentAsString, "$.id")

        val imageIds = (1..2).map {
            val uploaded = mockMvc.perform(
                multipart("/api/admin/guides/$guideId/content-images")
                    .file(MockMultipartFile("image", "same-$it.png", "image/png", onePixelPng))
                    .with(jwt()),
            ).andExpect(status().isCreated).andReturn()
            JsonPath.read<String>(uploaded.response.contentAsString, "$.id")
        }

        val storedKeys = dsl.fetch(
            "select storage_key from guide_content_images where guide_id = ? order by id",
            java.util.UUID.fromString(guideId),
        ).map { it.get("storage_key", String::class.java) }
        kotlin.test.assertEquals(2, storedKeys.size)
        kotlin.test.assertEquals(1, storedKeys.distinct().size)

        mockMvc.perform(get("/api/admin/media").with(jwt()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].usageCount").value(2))

        mockMvc.perform(
            delete("/api/admin/guides/$guideId/content-images/${imageIds.first()}").with(jwt()),
        ).andExpect(status().isNoContent)
        mockMvc.perform(
            get("/api/admin/guides/$guideId/content-images/${imageIds.last()}").with(jwt()),
        ).andExpect(status().isOk)

        mockMvc.perform(
            delete("/api/admin/guides/$guideId/content-images/${imageIds.last()}").with(jwt()),
        ).andExpect(status().isNoContent)
        mockMvc.perform(
            get("/api/admin/guides/$guideId/content-images/${imageIds.last()}").with(jwt()),
        ).andExpect(status().isNotFound)
    }

    private val validGuideJson =
        """
        {
          "status":"DRAFT",
          "author":"Iara Gouveia",
          "categories":["Preparação"],
          "tags":["massagem"],
          "translations":{
            "pt-PT":{
              "title":"Primeira massagem",
              "excerpt":"O que esperar antes da sua primeira sessão.",
              "seoTitle":"Primeira massagem em Almada",
              "metaDescription":"Saiba como preparar a sua primeira massagem em Almada.",
              "blocks":[{"type":"PARAGRAPH","text":"Chegue com alguns minutos de antecedência."}],
              "faqs":[{"question":"O que devo vestir?","answer":"Roupa confortável."}]
            },
            "en-US":{
              "title":"Your first massage",
              "excerpt":"What to expect before your first session.",
              "seoTitle":"Your first massage in Almada",
              "metaDescription":"Learn how to prepare for your first massage in Almada.",
              "blocks":[{"type":"PARAGRAPH","text":"Arrive a few minutes early."}],
              "faqs":[{"question":"What should I wear?","answer":"Comfortable clothing."}]
            }
          }
        }
        """.trimIndent()

    private val onePixelPng = Base64.getDecoder().decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    )
}
