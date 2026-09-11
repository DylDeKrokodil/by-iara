package com.byiara.api.popup.api

import com.byiara.api.popup.application.PopupService
import com.byiara.api.popup.domain.PopupContent
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/admin/popups")
class AdminPopupController(private val service: PopupService) {
    @GetMapping
    fun list() = service.list()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody content: PopupContent) = service.save(UUID.randomUUID(), content, true)

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody content: PopupContent) = service.save(id, content, false)

    @PutMapping("/{id}/active")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun setActive(@PathVariable id: UUID, @RequestBody request: PopupActivationRequest) = service.setActive(id, request.active)
}

data class PopupActivationRequest(val active: Boolean)
data class PublicPopupResponse(val id: UUID, val titlePt: String, val titleEn: String, val bodyPt: String, val bodyEn: String, val action: String)

@RestController
@RequestMapping("/api/popups/active")
class PublicPopupController(private val service: PopupService) {
    @GetMapping
    fun active(): ResponseEntity<PublicPopupResponse> {
        val popup = service.active() ?: return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build()
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            PublicPopupResponse(popup.id, popup.content.titlePt, popup.content.titleEn, popup.content.bodyPt, popup.content.bodyEn, popup.content.action)
        )
    }
}
