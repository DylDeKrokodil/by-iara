package com.byiara.api.catalog.domain

data class ServiceCommand(
    val name: String,
    val description: String?,
    val active: Boolean,
    val sortOrder: Int,
    val featured: Boolean = false,
    val translations: Map<String, ServiceTranslationCommand> = emptyMap(),
    val variants: List<VariantCommand>,
    val packOffers: List<PackOfferCommand> = emptyList(),
)

data class ServiceTranslationCommand(
    val name: String,
    val description: String?,
    val slug: String? = null,
    val treatmentDescription: String? = null,
    val suitableFor: String? = null,
    val sessionDescription: String? = null,
    val faqs: List<ServiceFaqCommand> = emptyList(),
)

data class ServiceFaqCommand(
    val question: String,
    val answer: String,
    val sortOrder: Int,
)

data class VariantCommand(
    val durationMinutes: Int,
    val priceCents: Long,
    val currency: String,
    val active: Boolean,
    val sortOrder: Int,
)

data class PackOfferCommand(
    val durationMinutes: Int,
    val sessionCount: Int,
    val priceCents: Long,
    val currency: String,
    val validityDays: Int?,
    val active: Boolean,
    val sortOrder: Int,
)
