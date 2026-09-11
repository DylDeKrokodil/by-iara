package com.byiara.api.popup.domain

import java.util.UUID

data class PopupContent(
    val name: String,
    val titlePt: String,
    val titleEn: String,
    val bodyPt: String,
    val bodyEn: String,
    val action: String,
)

data class Popup(val id: UUID, val content: PopupContent, val active: Boolean)

interface PopupRepository {
    fun list(): List<Popup>
    fun active(): Popup?
    fun save(id: UUID, content: PopupContent, create: Boolean): Popup?
    fun setActive(id: UUID, active: Boolean): Boolean
}
