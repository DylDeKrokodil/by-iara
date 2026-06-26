package com.byiara.api

import com.byiara.api.auth.domain.AdminRole
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.jooq.DSLContext
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.MvcResult
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ByIaraApiApplicationTests {
	@Autowired
	private lateinit var mockMvc: MockMvc

	@Autowired
	private lateinit var dsl: DSLContext

	@Autowired
	private lateinit var passwordEncoder: PasswordEncoder

	@BeforeEach
	fun seedAdminUser() {
		dsl.execute(
			"""
			create table if not exists admin_users (
			    id uuid primary key,
			    email varchar(255) not null unique,
			    password_hash varchar(255) not null,
			    role varchar(40) not null,
			    active boolean not null,
			    created_at timestamp with time zone not null,
			    updated_at timestamp with time zone not null
			)
			""".trimIndent(),
		)

		val adminUsers = table(name("admin_users"))
		dsl.deleteFrom(adminUsers).execute()
		dsl.insertInto(adminUsers)
			.columns(
				field(name("id")),
				field(name("email")),
				field(name("password_hash")),
				field(name("role")),
				field(name("active")),
				field(name("created_at")),
				field(name("updated_at")),
			)
			.values(
				field("random_uuid()"),
				"admin@by-iara.local",
				requireNotNull(passwordEncoder.encode("ChangeMe123!")),
				AdminRole.ADMIN.name,
				true,
				currentOffsetDateTime(),
				currentOffsetDateTime(),
			)
			.execute()
	}

	@Test
	fun contextLoads() {
	}

	@Test
	fun `health endpoint returns service status`() {
		mockMvc.perform(get("/health"))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("UP"))
			.andExpect(jsonPath("$.service").value("by-iara-api"))
	}

	@Test
	fun `admin login returns an access token`() {
		mockMvc.perform(
			post("/api/admin/auth/login")
				.contentType("application/json")
				.content("""{"email":"admin@by-iara.local","password":"ChangeMe123!"}"""),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.accessToken").isString)
			.andExpect(jsonPath("$.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.expiresInSeconds").value(3600))
			.andExpect(jsonPath("$.admin.email").value("admin@by-iara.local"))
			.andExpect(jsonPath("$.admin.role").value("ADMIN"))
	}

	@Test
	fun `admin login returns a signed JWT that can access protected admin routes`() {
		val loginResult = login()
		val response = loginResult.response.contentAsString
		val token = Regex(""""accessToken":"([^"]+)"""")
			.find(response)
			?.groupValues
			?.get(1)
			?: error("Missing accessToken")

		kotlin.test.assertEquals(3, token.split(".").size)

		mockMvc.perform(
			get("/api/admin/auth/me")
				.header("Authorization", "Bearer $token"),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.email").value("admin@by-iara.local"))
			.andExpect(jsonPath("$.role").value("ADMIN"))
	}

	@Test
	fun `protected admin routes require a valid JWT`() {
		mockMvc.perform(get("/api/admin/auth/me"))
			.andExpect(status().isUnauthorized)
	}

	@Test
	fun `admin login rejects invalid credentials`() {
		mockMvc.perform(
			post("/api/admin/auth/login")
				.contentType("application/json")
				.content("""{"email":"admin@by-iara.local","password":"wrong"}"""),
		)
			.andExpect(status().isUnauthorized)
			.andExpect(jsonPath("$.message").value("Invalid email or password"))
	}

	private fun login(): MvcResult =
		mockMvc.perform(
			post("/api/admin/auth/login")
				.contentType("application/json")
				.content("""{"email":"admin@by-iara.local","password":"ChangeMe123!"}"""),
		)
			.andExpect(status().isOk)
			.andReturn()
}
