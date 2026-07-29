package com.byiara.api.guide.api

import com.byiara.api.guide.domain.Guide
import com.byiara.api.guide.domain.GuideBlock
import com.byiara.api.guide.domain.GuideBlockType
import com.byiara.api.guide.domain.GuideCommand
import com.byiara.api.guide.domain.GuideFaq
import com.byiara.api.guide.domain.GuideImageType
import com.byiara.api.guide.domain.GuideStatus
import com.byiara.api.guide.domain.GuideTranslation
import com.byiara.api.guide.domain.GuideTranslationCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime
import java.util.UUID

data class GuideRequest(
    val status: GuideStatus = GuideStatus.DRAFT,

    @field:NotBlank
    @field:Size(max = 160)
    val author: String,

    val publishedAt: OffsetDateTime? = null,

    @field:Size(min = 2, max = 2)
    @field:Valid
    val translations: Map<String, GuideTranslationRequest>,

    @field:Size(max = 12)
    val categories: List<@NotBlank @Size(max = 100) String> = emptyList(),

    @field:Size(max = 30)
    val tags: List<@NotBlank @Size(max = 100) String> = emptyList(),

    @field:Size(max = 12)
    val relatedServiceIds: List<UUID> = emptyList(),
) {
    fun toCommand(): GuideCommand =
        GuideCommand(
            status = status,
            author = author.trim(),
            publishedAt = publishedAt,
            translations = translations.mapValues { it.value.toCommand() },
            categories = categories,
            tags = tags,
            relatedServiceIds = relatedServiceIds,
        )
}

data class GuideTranslationRequest(
    @field:Size(max = 140)
    @field:Pattern(
        regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        message = "must contain lowercase letters, numbers, and single hyphens only",
    )
    val slug: String? = null,

    @field:NotBlank
    @field:Size(max = 180)
    val title: String,

    @field:NotBlank
    @field:Size(max = 600)
    val excerpt: String,

    @field:NotBlank
    @field:Size(max = 180)
    val seoTitle: String,

    @field:NotBlank
    @field:Size(max = 320)
    val metaDescription: String,

    @field:Size(max = 120)
    @field:Valid
    val blocks: List<GuideBlockRequest> = emptyList(),

    @field:Size(max = 30)
    @field:Valid
    val faqs: List<GuideFaqRequest> = emptyList(),
) {
    fun toCommand(): GuideTranslationCommand =
        GuideTranslationCommand(
            slug = slug?.trim()?.ifBlank { null },
            title = title.trim(),
            excerpt = excerpt.trim(),
            seoTitle = seoTitle.trim(),
            metaDescription = metaDescription.trim(),
            blocks = blocks.map(GuideBlockRequest::toDomain),
            faqs = faqs.map(GuideFaqRequest::toDomain),
        )
}

data class GuideBlockRequest(
    val type: GuideBlockType,
    val text: String? = null,
    val headingLevel: Int? = null,
    val items: List<String> = emptyList(),
    @field:Size(max = 1000)
    val imageUrl: String? = null,
    @field:Size(max = 300)
    val imageAlt: String? = null,
    @field:Size(max = 160)
    val actionLabel: String? = null,
    @field:Size(max = 1000)
    val actionUrl: String? = null,
) {
    fun toDomain(): GuideBlock =
        GuideBlock(
            type = type,
            text = text?.trim()?.ifBlank { null },
            headingLevel = headingLevel,
            items = items.map(String::trim).filter(String::isNotBlank),
            imageUrl = imageUrl?.trim()?.ifBlank { null },
            imageAlt = imageAlt?.trim()?.ifBlank { null },
            actionLabel = actionLabel?.trim()?.ifBlank { null },
            actionUrl = actionUrl?.trim()?.ifBlank { null },
        )
}

data class GuideFaqRequest(
    @field:NotBlank val question: String,
    @field:NotBlank val answer: String,
) {
    fun toDomain() = GuideFaq(question.trim(), answer.trim())
}

data class GuideBulkStatusRequest(
    @field:Size(min = 1, max = 100)
    val ids: List<UUID>,
    val status: GuideStatus,
)

data class GuideResponse(
    val id: UUID,
    val status: GuideStatus,
    val author: String,
    val publishedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
    val translations: Map<String, GuideTranslationResponse>,
    val categories: List<String>,
    val tags: List<String>,
    val relatedServiceIds: List<UUID>,
    val images: Map<GuideImageType, GuideImageResponse>,
)

data class GuideTranslationResponse(
    val slug: String,
    val title: String,
    val excerpt: String,
    val seoTitle: String,
    val metaDescription: String,
    val blocks: List<GuideBlock>,
    val faqs: List<GuideFaq>,
)

data class GuideImageResponse(
    val url: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
)

data class GuideContentImageResponse(
    val id: UUID,
    val url: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
)

fun Guide.toResponse(): GuideResponse =
    GuideResponse(
        id = id,
        status = status,
        author = author,
        publishedAt = publishedAt,
        createdAt = createdAt,
        updatedAt = updatedAt,
        translations = translations.mapValues { it.value.toResponse() },
        categories = categories,
        tags = tags,
        relatedServiceIds = relatedServiceIds,
        images = images.mapValues { (type, image) ->
            GuideImageResponse(
                url = "/api/guides/images/$id/${type.name}?v=${image.updatedAt.toInstant().toEpochMilli()}",
                width = image.width,
                height = image.height,
                byteSize = image.byteSize,
            )
        },
    )

private fun GuideTranslation.toResponse() =
    GuideTranslationResponse(
        slug = slug,
        title = title,
        excerpt = excerpt,
        seoTitle = seoTitle,
        metaDescription = metaDescription,
        blocks = blocks,
        faqs = faqs,
    )
