package com.byiara.api.guide.api

import com.byiara.api.guide.application.GuideService
import com.byiara.api.guide.domain.GuideImageType
import com.byiara.api.guide.domain.GuideListQuery
import com.byiara.api.guide.domain.GuideSort
import com.byiara.api.guide.domain.GuideSortDirection
import com.byiara.api.guide.domain.GuideStatus
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
@RequestMapping("/api/admin/guides")
class AdminGuideController(
    private val guideService: GuideService,
) {
    @GetMapping
    fun list(
        @RequestParam(required = false) status: GuideStatus?,
        @RequestParam(required = false, name = "q") search: String?,
        @RequestParam(defaultValue = "UPDATED_AT") sort: GuideSort,
        @RequestParam(defaultValue = "DESC") direction: GuideSortDirection,
    ): List<GuideResponse> =
        guideService.listAdmin(GuideListQuery(status, search, sort, direction)).map { it.toResponse() }

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): GuideResponse = guideService.getAdmin(id).toResponse()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: GuideRequest): GuideResponse =
        guideService.create(request.toCommand()).toResponse()

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @Valid @RequestBody request: GuideRequest): GuideResponse =
        guideService.update(id, request.toCommand()).toResponse()

    @PutMapping("/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun updateStatus(@Valid @RequestBody request: GuideBulkStatusRequest) =
        guideService.changeStatus(request.ids, request.status)

    @PutMapping("/{id}/images/{type}", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadImage(
        @PathVariable id: UUID,
        @PathVariable type: GuideImageType,
        @RequestPart("image") image: MultipartFile,
    ): GuideResponse = guideService.saveImage(id, type, image.bytes).toResponse()

    @PutMapping("/{id}/images/{type}/media/{mediaAssetId}")
    fun useMediaImage(
        @PathVariable id: UUID,
        @PathVariable type: GuideImageType,
        @PathVariable mediaAssetId: UUID,
    ): GuideResponse = guideService.useImage(id, type, mediaAssetId).toResponse()

    @GetMapping("/{id}/images/{type}")
    fun image(@PathVariable id: UUID, @PathVariable type: GuideImageType): ResponseEntity<ByteArray> {
        val image = guideService.getImage(id, type) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(image.contentType))
            .contentLength(image.data.size.toLong())
            .body(image.data)
    }

    @DeleteMapping("/{id}/images/{type}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteImage(@PathVariable id: UUID, @PathVariable type: GuideImageType) =
        guideService.deleteImage(id, type)

    @PostMapping("/{id}/content-images", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun uploadContentImage(
        @PathVariable id: UUID,
        @RequestPart("image") image: MultipartFile,
    ): GuideContentImageResponse {
        val asset = guideService.saveContentImage(id, image.bytes)
        return GuideContentImageResponse(
            id = asset.id,
            url = "/api/guides/images/content/$id/${asset.id}",
            width = asset.width,
            height = asset.height,
            byteSize = asset.byteSize,
        )
    }

    @PostMapping("/{id}/content-images/media/{mediaAssetId}")
    @ResponseStatus(HttpStatus.CREATED)
    fun useMediaContentImage(
        @PathVariable id: UUID,
        @PathVariable mediaAssetId: UUID,
    ): GuideContentImageResponse {
        val asset = guideService.useContentImage(id, mediaAssetId)
        return GuideContentImageResponse(
            id = asset.id,
            url = "/api/guides/images/content/$id/${asset.id}",
            width = asset.width,
            height = asset.height,
            byteSize = asset.byteSize,
        )
    }

    @GetMapping("/{id}/content-images/{imageId}")
    fun contentImage(
        @PathVariable id: UUID,
        @PathVariable imageId: UUID,
    ): ResponseEntity<ByteArray> {
        val image = guideService.getContentImage(id, imageId, publicOnly = false)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(image.contentType))
            .contentLength(image.data.size.toLong())
            .body(image.data)
    }

    @DeleteMapping("/{id}/content-images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteContentImage(
        @PathVariable id: UUID,
        @PathVariable imageId: UUID,
    ) = guideService.deleteContentImage(id, imageId)
}
