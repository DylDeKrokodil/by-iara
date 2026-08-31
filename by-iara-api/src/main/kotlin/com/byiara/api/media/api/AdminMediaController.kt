package com.byiara.api.media.api

import com.byiara.api.media.application.MediaService
import com.byiara.api.media.domain.MediaAsset
import com.byiara.api.media.domain.MediaAssetOverview
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
@RequestMapping("/api/admin/media")
class AdminMediaController(
    private val mediaService: MediaService,
) {
    @GetMapping
    fun list(): List<MediaAssetResponse> = mediaService.list().map(MediaAssetOverview::toResponse)

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(@RequestPart("image") image: MultipartFile): MediaAssetResponse =
        MediaAssetOverview(mediaService.store(image.bytes), 0, emptySet()).toResponse()

    @GetMapping("/{id}/data")
    fun data(@PathVariable id: UUID): ResponseEntity<ByteArray> {
        val (asset, bytes) = mediaService.read(id) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(asset.contentType))
            .contentLength(bytes.size.toLong())
            .body(bytes)
    }
}

data class MediaAssetResponse(
    val id: UUID,
    val url: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
    val usageCount: Int,
    val usageTypes: Set<String>,
    val createdAt: java.time.OffsetDateTime,
)

private fun MediaAssetOverview.toResponse(): MediaAssetResponse =
    MediaAssetResponse(
        id = asset.id,
        url = "/api/admin/media/${asset.id}/data",
        width = asset.width,
        height = asset.height,
        byteSize = asset.byteSize,
        usageCount = usageCount,
        usageTypes = usageTypes.map { it.name }.toSet(),
        createdAt = asset.createdAt,
    )
