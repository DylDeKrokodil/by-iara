package com.byiara.api.guide.domain

import java.time.OffsetDateTime
import java.util.UUID

data class GuideCommand(
    val status: GuideStatus,
    val author: String,
    val publishedAt: OffsetDateTime?,
    val translations: Map<String, GuideTranslationCommand>,
    val categories: List<String>,
    val tags: List<String>,
    val relatedServiceIds: List<UUID>,
)

data class GuideTranslationCommand(
    val slug: String?,
    val title: String,
    val excerpt: String,
    val seoTitle: String,
    val metaDescription: String,
    val blocks: List<GuideBlock>,
    val faqs: List<GuideFaq>,
)
