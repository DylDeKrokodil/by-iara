package com.byiara.api.customer.api

import com.byiara.api.customer.application.CustomerQueryService
import com.byiara.api.customer.application.CustomerAnonymisationService
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@Validated
@RestController
@RequestMapping("/api/admin/customers")
class AdminCustomerController(
    private val customerQueryService: CustomerQueryService,
    private val customerAnonymisationService: CustomerAnonymisationService,
) {
    @GetMapping
    fun search(
        @RequestParam
        @Size(min = 2, max = 255)
        email: String,
        @RequestParam(defaultValue = "0")
        @Min(0)
        page: Int,
        @RequestParam(defaultValue = "20")
        @Min(1)
        @Max(50)
        size: Int,
    ): CustomerSearchPageResponse =
        customerQueryService.search(email, page, size).toResponse()

    @DeleteMapping("/{id}/personal-data")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun anonymise(
        @PathVariable id: UUID,
        @AuthenticationPrincipal jwt: Jwt,
    ) {
        customerAnonymisationService.anonymise(
            customerId = id,
            performedBy = requireNotNull(jwt.getClaimAsString("email")),
        )
    }
}
