package com.byiara.api.discount.api

import com.byiara.api.discount.application.DiscountAdministrationService
import com.byiara.api.discount.application.DiscountService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/admin/discounts")
class AdminDiscountController(
    private val service: DiscountService,
    private val administrationService: DiscountAdministrationService,
) {
    @GetMapping
    fun list(): List<DiscountResponse> = service.list().map { it.toResponse() }

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): DiscountResponse = service.get(id).toResponse()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: CreateDiscountRequest): CreatedDiscountResponse {
        val result = administrationService.create(request.toCommand(), request.sendEmail)
        return result.created.toResponse(result.deliveryStatus?.name)
    }

    @PatchMapping("/{id}/status")
    fun updateStatus(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateDiscountStatusRequest,
    ): DiscountResponse = service.setStatus(id, request.status!!).toResponse()

    @PatchMapping("/{id}/featured")
    fun updateFeatured(
        @PathVariable id: UUID,
        @RequestBody request: UpdateFeaturedDiscountRequest,
    ): DiscountResponse = service.setFeatured(id, request.featured).toResponse()

    @GetMapping("/{id}/usage")
    fun usage(@PathVariable id: UUID): List<DiscountUsageResponse> = service.usage(id).map { it.toResponse() }
}
