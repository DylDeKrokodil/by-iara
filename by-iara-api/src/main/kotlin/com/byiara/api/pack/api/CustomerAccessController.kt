package com.byiara.api.pack.api

import com.byiara.api.common.ratelimit.PublicRequestRateLimiter
import com.byiara.api.pack.application.CustomerAccessService
import com.byiara.api.pack.domain.CustomerAccessDeniedException
import com.byiara.api.pack.domain.CustomerPack
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.util.UUID

data class RequestCustomerAccessRequest(
    @field:NotBlank @field:Email @field:Size(max = 255) val email: String,
    @field:Pattern(regexp = "pt|en") val locale: String = "en",
)
data class ExchangeCustomerAccessRequest(@field:NotBlank val token: String)
data class CustomerAccessResponse(
    val sessionToken: String,
    val customer: CustomerAccessCustomerResponse,
    val packs: List<CustomerPackResponse>,
)
data class CustomerAccessCustomerResponse(val name: String, val email: String, val phone: String?)
data class CustomerPackResponse(
    val id: UUID,
    val serviceId: UUID?,
    val serviceName: String,
    val durationMinutes: Int,
    val totalSessions: Int,
    val remainingSessions: Int,
    val expiresAt: OffsetDateTime?,
)

@RestController
@RequestMapping("/api/customer-access")
class CustomerAccessController(
    private val service: CustomerAccessService,
    private val rateLimiter: PublicRequestRateLimiter,
) {
    @PostMapping("/request")
    fun request(@Valid @RequestBody request: RequestCustomerAccessRequest): ResponseEntity<Void> {
        rateLimiter.consumeCustomerAccessEmail(request.email)
        service.requestLink(request.email, request.locale)
        return ResponseEntity.accepted().build()
    }

    @PostMapping("/exchange")
    fun exchange(@Valid @RequestBody request: ExchangeCustomerAccessRequest): CustomerAccessResponse {
        val session = service.exchange(request.token)
        return CustomerAccessResponse(
            sessionToken = session.token,
            customer = CustomerAccessCustomerResponse(
                session.customer.name,
                session.customer.email,
                session.customer.phone,
            ),
            packs = session.packs.map(CustomerPack::toResponse),
        )
    }

    @GetMapping("/packs")
    fun packs(
        @RequestHeader("X-Customer-Session") sessionToken: String,
        @RequestParam(required = false) serviceId: UUID?,
        @RequestParam(required = false) durationMinutes: Int?,
    ): List<CustomerPackResponse> = service.packs(sessionToken, serviceId, durationMinutes).map(CustomerPack::toResponse)

    @ExceptionHandler(CustomerAccessDeniedException::class)
    fun denied(): ResponseEntity<Void> = ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
}

private fun CustomerPack.toResponse() = CustomerPackResponse(
    id, serviceId, serviceName, durationMinutes, totalSessions, remainingSessions, expiresAt,
)
