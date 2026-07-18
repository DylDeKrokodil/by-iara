package com.byiara.api.catalog.api

import com.byiara.api.catalog.application.CatalogService
import com.byiara.api.catalog.domain.ServiceListQuery
import com.byiara.api.catalog.domain.ServiceSort
import com.byiara.api.catalog.domain.SortDirection
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/admin/services")
class AdminServiceController(
    private val catalogService: CatalogService,
) {
    @GetMapping
    fun list(
        @RequestParam(required = false) active: Boolean?,
        @RequestParam(required = false, name = "q") search: String?,
        @RequestParam(defaultValue = "DISPLAY_ORDER") sort: ServiceSort,
        @RequestParam(defaultValue = "ASC") direction: SortDirection,
    ): List<ServiceResponse> =
        catalogService.listAll(
            ServiceListQuery(
                active = active,
                search = search,
                sort = sort,
                direction = direction,
            ),
        ).map { it.toResponse() }

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): ServiceResponse =
        catalogService.get(id).toResponse()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: ServiceRequest): ServiceResponse =
        catalogService.create(request.toCommand()).toResponse()

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: ServiceRequest,
    ): ServiceResponse =
        catalogService.update(id, request.toCommand()).toResponse()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: UUID) =
        catalogService.deactivate(id)
}
