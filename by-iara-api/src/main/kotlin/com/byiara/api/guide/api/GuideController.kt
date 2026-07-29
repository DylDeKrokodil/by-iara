package com.byiara.api.guide.api

import com.byiara.api.guide.application.GuideService
import com.byiara.api.guide.domain.GuideImageType
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Duration
import java.util.UUID

@RestController
@RequestMapping("/api/guides")
class GuideController(
    private val guideService: GuideService,
) {
    @GetMapping("/{locale}")
    fun list(@PathVariable locale: String): List<GuideResponse> =
        guideService.listPublished(locale).map { it.toResponse() }

    @GetMapping("/{locale}/{slug}")
    fun get(@PathVariable locale: String, @PathVariable slug: String): ResponseEntity<GuideResponse> =
        guideService.findPublished(locale, slug)
            ?.let { ResponseEntity.ok(it.toResponse()) }
            ?: ResponseEntity.notFound().build()

    @GetMapping("/images/{id}/{type}")
    fun image(@PathVariable id: UUID, @PathVariable type: GuideImageType): ResponseEntity<ByteArray> {
        val image = guideService.getPublicImage(id, type) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(image.contentType))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
            .contentLength(image.data.size.toLong())
            .body(image.data)
    }

    @GetMapping("/images/content/{id}/{imageId}")
    fun contentImage(
        @PathVariable id: UUID,
        @PathVariable imageId: UUID,
    ): ResponseEntity<ByteArray> {
        val image = guideService.getContentImage(id, imageId, publicOnly = true)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(image.contentType))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
            .contentLength(image.data.size.toLong())
            .body(image.data)
    }
}
