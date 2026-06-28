package com.byiara.api.catalog.domain

data class ServiceCommand(
    val name: String,
    val description: String?,
    val active: Boolean,
    val sortOrder: Int,
    val featured: Boolean = false,
    val translations: Map<String, ServiceTranslationCommand> = emptyMap(),
    val variants: List<VariantCommand>,
)

data class ServiceTranslationCommand(
    val name: String,
    val description: String?,
)

data class VariantCommand(
    val durationMinutes: Int,
    val priceCents: Long,
    val currency: String,
    val active: Boolean,
    val sortOrder: Int,
)
