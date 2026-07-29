package com.byiara.api.media.domain

import java.time.OffsetDateTime
import java.util.UUID

data class MediaAsset(
    val id: UUID,
    val contentHash: String,
    val contentType: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
    val storageKey: String,
    val createdAt: OffsetDateTime,
)

data class MediaAssetOverview(
    val asset: MediaAsset,
    val usageCount: Int,
    val usageTypes: Set<MediaUsageType>,
)

enum class MediaUsageType {
    SERVICE,
    GUIDE_IMAGE,
    GUIDE_CONTENT,
}

interface MediaRepository {
    fun findAll(): List<MediaAssetOverview>
    fun findUnverified(): List<MediaAsset>
    fun findById(id: UUID): MediaAsset?
    fun findByHash(contentHash: String): MediaAsset?
    fun save(asset: MediaAsset)
    fun verifyHash(id: UUID, contentHash: String)
    fun replaceReferences(duplicate: MediaAsset, canonical: MediaAsset)
    fun delete(id: UUID)
}
