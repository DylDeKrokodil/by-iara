package com.byiara.api.guide.domain

import java.time.OffsetDateTime
import java.util.UUID

enum class GuideStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED,
}

enum class GuideBlockType {
    PARAGRAPH,
    HEADING,
    IMAGE,
    LIST,
    QUOTE,
    CALL_TO_ACTION,
}

enum class GuideImageType {
    COVER,
    SOCIAL,
}

data class Guide(
    val id: UUID,
    val status: GuideStatus,
    val author: String,
    val publishedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
    val translations: Map<String, GuideTranslation>,
    val categories: List<String>,
    val tags: List<String>,
    val relatedServiceIds: List<UUID>,
    val images: Map<GuideImageType, GuideImageMetadata>,
)

data class GuideTranslation(
    val slug: String,
    val title: String,
    val excerpt: String,
    val seoTitle: String,
    val metaDescription: String,
    val blocks: List<GuideBlock>,
    val faqs: List<GuideFaq>,
)

data class GuideBlock(
    val type: GuideBlockType,
    val text: String? = null,
    val headingLevel: Int? = null,
    val items: List<String> = emptyList(),
    val imageUrl: String? = null,
    val imageAlt: String? = null,
    val actionLabel: String? = null,
    val actionUrl: String? = null,
)

data class GuideFaq(
    val question: String,
    val answer: String,
)

data class GuideImageMetadata(
    val width: Int,
    val height: Int,
    val byteSize: Int,
    val updatedAt: OffsetDateTime,
)

data class GuideImageAsset(
    val mediaAssetId: UUID,
    val storageKey: String,
    val contentType: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
    val updatedAt: OffsetDateTime,
)

data class StoredGuideImage(
    val contentType: String,
    val data: ByteArray,
    val updatedAt: OffsetDateTime,
)

data class GuideContentImageAsset(
    val id: UUID,
    val guideId: UUID,
    val mediaAssetId: UUID,
    val storageKey: String,
    val contentHash: String,
    val contentType: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
    val createdAt: OffsetDateTime,
)
