package com.byiara.api.popup.application

import com.byiara.api.popup.domain.PopupContent
import com.byiara.api.popup.domain.PopupRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@Service
class PopupService(private val repository: PopupRepository) {
    fun list() = repository.list()
    fun active() = repository.active()

    @Transactional
    fun save(id: UUID, input: PopupContent, create: Boolean) = repository.save(id, validate(input), create)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Popup not found")

    @Transactional
    fun setActive(id: UUID, active: Boolean) {
        if (!repository.setActive(id, active)) throw ResponseStatusException(HttpStatus.NOT_FOUND, "Popup not found")
    }

    internal fun validate(input: PopupContent): PopupContent {
        val content = input.copy(name = input.name.trim(), titlePt = input.titlePt.trim(), titleEn = input.titleEn.trim(), bodyPt = input.bodyPt.trim(), bodyEn = input.bodyEn.trim())
        val shortFields = listOf(content.name, content.titlePt, content.titleEn)
        val bodies = listOf(content.bodyPt, content.bodyEn)
        if (shortFields.any { it.isBlank() || it.length > 80 } || bodies.any { it.isBlank() || it.length > 240 } || content.action !in setOf("book", "services", "packs")) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide both translations, titles up to 80 characters, messages up to 240 characters, and a supported action")
        }
        return content
    }
}
