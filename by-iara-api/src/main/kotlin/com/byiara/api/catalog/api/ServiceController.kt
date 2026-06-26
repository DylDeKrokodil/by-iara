package com.byiara.api.catalog.api

import com.byiara.api.catalog.application.CatalogService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/services")
class ServiceController(
    private val catalogService: CatalogService,
) {
    @GetMapping
    fun list(): List<ServiceResponse> =
        catalogService.listPublicCatalog().map { it.toResponse() }
}
