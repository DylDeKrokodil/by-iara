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
    val variants: List<ServiceVariant>,
)

data class ServiceVariant(
    val id: UUID,
    val durationMinutes: Int,
    val price: Money,
    val active: Boolean,
    val sortOrder: Int,
)
