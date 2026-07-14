package com.byiara.api.catalog.domain

import java.util.UUID

data class Service(
    val id: UUID,
    val slug: String,
    val name: String,
    val description: String?,
    val active: Boolean,
    val sortOrder: Int,
    val featured: Boolean = false,
    val translations: Map<String, ServiceTranslation> = emptyMap(),
    val variants: List<ServiceVariant>,
)

data class ServiceTranslation(
    val slug: String,
    val name: String,
    val description: String?,
)

data class ServiceVariant(
    val id: UUID,
    val durationMinutes: Int,
    val price: Money,
    val active: Boolean,
    val sortOrder: Int,
)
