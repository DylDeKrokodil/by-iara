package com.byiara.api.catalog.api

import com.byiara.api.catalog.application.CatalogService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.ResponseEntity

@RestController
@RequestMapping("/api/services")
class ServiceController(
    private val catalogService: CatalogService,
) {
    @GetMapping
    fun list(): List<ServiceResponse> =
        catalogService.listPublicCatalog().map { it.toResponse() }

    @GetMapping("/{locale}/{slug}")
    fun get(
        @PathVariable locale: String,
        @PathVariable slug: String,
    ): ResponseEntity<ServiceResponse> =
        catalogService.findPublicByLocalizedSlug(locale, slug)
            ?.let { ResponseEntity.ok(it.toResponse()) }
            ?: ResponseEntity.notFound().build()
}
