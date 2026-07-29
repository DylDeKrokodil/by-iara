package com.byiara.api.guide.domain

import java.util.UUID

enum class GuideSort {
    UPDATED_AT,
    PUBLISHED_AT,
    TITLE,
    STATUS,
}

enum class GuideSortDirection {
    ASC,
    DESC,
}

data class GuideListQuery(
    val status: GuideStatus? = null,
    val search: String? = null,
    val sort: GuideSort = GuideSort.UPDATED_AT,
    val direction: GuideSortDirection = GuideSortDirection.DESC,
)

interface GuideRepository {
    fun findAll(query: GuideListQuery): List<Guide>
    fun findById(id: UUID): Guide?
    fun findPublished(locale: String): List<Guide>
    fun findPublishedBySlug(locale: String, slug: String): Guide?
    fun slugExists(locale: String, slug: String, excludingId: UUID? = null): Boolean
    fun create(command: GuideCommand): Guide
    fun update(id: UUID, command: GuideCommand): Guide?
    fun updateStatus(ids: Collection<UUID>, status: GuideStatus): Int
    fun saveImage(id: UUID, type: GuideImageType, asset: GuideImageAsset)
    fun findImage(id: UUID, type: GuideImageType): GuideImageAsset?
    fun deleteImage(id: UUID, type: GuideImageType): Boolean
    fun saveContentImage(asset: GuideContentImageAsset)
    fun findContentImage(guideId: UUID, imageId: UUID): GuideContentImageAsset?
    fun findContentImages(guideId: UUID): List<GuideContentImageAsset>
    fun deleteContentImage(guideId: UUID, imageId: UUID): GuideContentImageAsset?
}
