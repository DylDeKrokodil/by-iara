package com.byiara.api.calendar.api

import com.byiara.api.auth.domain.AdminAccountInactiveException
import com.byiara.api.auth.domain.AdminCredentialsRepository
import com.byiara.api.calendar.application.CalendarFeedTokenService
import com.byiara.api.calendar.domain.CalendarFeedLinks
import com.byiara.api.calendar.domain.CalendarFeedStatus
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@RestController
@RequestMapping("/api/admin/calendar-feed")
class AdminCalendarFeedController(
    private val calendarFeedTokenService: CalendarFeedTokenService,
    private val adminCredentialsRepository: AdminCredentialsRepository,
) {
    @GetMapping
    fun status(@AuthenticationPrincipal jwt: Jwt): CalendarFeedStatusResponse =
        calendarFeedTokenService.status(currentAdminId(jwt)).toResponse()

    @PostMapping
    fun regenerate(@AuthenticationPrincipal jwt: Jwt): CalendarFeedLinksResponse =
        calendarFeedTokenService.regenerate(currentAdminId(jwt)).toResponse()

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun revoke(@AuthenticationPrincipal jwt: Jwt) {
        calendarFeedTokenService.revoke(currentAdminId(jwt))
    }

    private fun currentAdminId(jwt: Jwt): UUID =
        adminCredentialsRepository
            .findActiveCredentialsByEmail(requireNotNull(jwt.getClaimAsString("email")))
            ?.id
            ?: throw AdminAccountInactiveException()

    private fun CalendarFeedStatus.toResponse(): CalendarFeedStatusResponse =
        CalendarFeedStatusResponse(active = active, createdAt = createdAt?.atOffset(ZoneOffset.UTC))

    private fun CalendarFeedLinks.toResponse(): CalendarFeedLinksResponse =
        CalendarFeedLinksResponse(httpsUrl = httpsUrl, webcalUrl = webcalUrl)
}

data class CalendarFeedStatusResponse(
    val active: Boolean,
    val createdAt: OffsetDateTime?,
)

data class CalendarFeedLinksResponse(
    val httpsUrl: String,
    val webcalUrl: String,
)
