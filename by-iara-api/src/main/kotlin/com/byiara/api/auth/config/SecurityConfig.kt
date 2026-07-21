package com.byiara.api.auth.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain

@Configuration
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain =
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers(HttpMethod.GET, "/health").permitAll()
                it.requestMatchers("/error").permitAll()
                it.requestMatchers(
                    HttpMethod.POST,
                    "/api/admin/auth/login",
                    "/api/admin/auth/refresh",
                    "/api/admin/auth/logout",
                ).permitAll()
                it.requestMatchers(
                    HttpMethod.GET,
                    "/api/services",
                    "/api/services/**",
                    "/api/availability",
                    "/api/availability/**",
                    "/api/reservations/availability",
                    "/api/reservations/next-available",
                    "/api/discounts/featured",
                ).permitAll()
                it.requestMatchers(HttpMethod.POST, "/api/reservations").permitAll()
                it.requestMatchers(HttpMethod.POST, "/api/reservations/discount-preview").permitAll()
                it.requestMatchers("/api/customer-access/**").permitAll()
                // Opaque-token-gated, not truly public: an iPhone calendar subscription can't send a
                // JWT, so this feed authenticates via the unguessable token in the path itself.
                it.requestMatchers(HttpMethod.GET, "/api/calendar-feed/**").permitAll()
                it.requestMatchers("/api/admin/**").authenticated()
                it.anyRequest().denyAll()
            }
            .oauth2ResourceServer { it.jwt {} }
            .build()
}
