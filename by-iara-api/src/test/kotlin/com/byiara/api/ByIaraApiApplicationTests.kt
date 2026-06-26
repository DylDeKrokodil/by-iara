package com.byiara.api

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class ByIaraApiApplicationTests {
	@Autowired
	private lateinit var mockMvc: MockMvc

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
				.content("""{"username":"admin","password":"ChangeMe123!"}"""),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.accessToken").isString)
			.andExpect(jsonPath("$.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.expiresInSeconds").value(3600))
			.andExpect(jsonPath("$.admin.username").value("admin"))
			.andExpect(jsonPath("$.admin.role").value("ADMIN"))
	}

	@Test
	fun `admin login rejects invalid credentials`() {
		mockMvc.perform(
			post("/api/admin/auth/login")
				.contentType("application/json")
				.content("""{"username":"admin","password":"wrong"}"""),
		)
			.andExpect(status().isUnauthorized)
			.andExpect(jsonPath("$.message").value("Invalid username or password"))
	}
}
