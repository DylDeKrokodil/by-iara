package com.byiara.api.availability.api

import com.byiara.api.availability.application.AvailabilityService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.time.OffsetDateTime
import java.util.UUID

@RestController
@RequestMapping("/api/admin/availability")
class AdminAvailabilityController(
    private val availabilityService: AvailabilityService,
) {
    // --- Rules ---

    @GetMapping("/rules")
    fun listRules(): List<AvailabilityRuleResponse> =
        availabilityService.listRules().map { it.toResponse() }

    @GetMapping("/rules/{id}")
    fun getRule(@PathVariable id: UUID): AvailabilityRuleResponse =
        availabilityService.getRule(id).toResponse()

    @PostMapping("/rules")
    @ResponseStatus(HttpStatus.CREATED)
    fun createRule(@Valid @RequestBody request: AvailabilityRuleRequest): AvailabilityRuleResponse =
        availabilityService.createRule(request.toCommand()).toResponse()

    @DeleteMapping("/rules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteRule(@PathVariable id: UUID) {
        availabilityService.deleteRule(id)
    }

    // --- Blocks ---

    @GetMapping("/blocks")
    fun listBlocks(
        @RequestParam(required = false) startAfter: OffsetDateTime?
    ): List<AvailabilityBlockResponse> =
        availabilityService.listBlocks(startAfter).map { it.toResponse() }

    @GetMapping("/blocks/{id}")
    fun getBlock(@PathVariable id: UUID): AvailabilityBlockResponse =
        availabilityService.getBlock(id).toResponse()

    @PostMapping("/blocks")
    @ResponseStatus(HttpStatus.CREATED)
    fun createBlock(@Valid @RequestBody request: AvailabilityBlockRequest): AvailabilityBlockResponse =
        availabilityService.createBlock(request.toCommand()).toResponse()

    @DeleteMapping("/blocks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteBlock(@PathVariable id: UUID) {
        availabilityService.deleteBlock(id)
    }
}
