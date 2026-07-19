package com.byiara.api.catalog.api

import com.byiara.api.catalog.application.CatalogService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.ResponseEntity
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import java.time.Duration
import java.util.UUID

@RestController
@RequestMapping("/api/services")
class ServiceController(
    private val catalogService: CatalogService,
) {
    @GetMapping
    fun list(): List<ServiceResponse> =
        catalogService.listPublicCatalog().map { it.toResponse() }

    @GetMapping("/{id}/image")
    fun image(@PathVariable id: UUID): ResponseEntity<ByteArray> {
        val image = catalogService.getImage(id) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(image.contentType))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
            .contentLength(image.data.size.toLong())
            .body(image.data)
    }

    @GetMapping("/{locale}/{slug}")
    fun get(
        @PathVariable locale: String,
        @PathVariable slug: String,
    ): ResponseEntity<ServiceResponse> =
        catalogService.findPublicByLocalizedSlug(locale, slug)
            ?.let { ResponseEntity.ok(it.toResponse()) }
            ?: ResponseEntity.notFound().build()
}
