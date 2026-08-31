package com.byiara.api.catalog.domain

import java.util.UUID
import java.time.OffsetDateTime

data class Service(
    val id: UUID,
    val slug: String,
    val name: String,
    val description: String?,
    val active: Boolean,
    val sortOrder: Int,
    val featured: Boolean = false,
    val image: ServiceImageMetadata? = null,
    val translations: Map<String, ServiceTranslation> = emptyMap(),
    val variants: List<ServiceVariant>,
    val packOffers: List<PackOffer> = emptyList(),
    val updatedAt: OffsetDateTime,
)

data class ServiceImageMetadata(
    val width: Int,
    val height: Int,
    val byteSize: Int,
    val updatedAt: OffsetDateTime,
)

data class StoredServiceImage(
    val contentType: String,
    val width: Int,
    val height: Int,
    val data: ByteArray,
    val updatedAt: OffsetDateTime,
)

data class ServiceImageAsset(
    val mediaAssetId: UUID,
    val storageKey: String,
    val contentType: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
    val updatedAt: OffsetDateTime,
)

data class ServiceTranslation(
    val slug: String,
    val name: String,
    val description: String?,
    val treatmentDescription: String?,
    val suitableFor: String?,
    val sessionDescription: String?,
    val faqs: List<ServiceFaq> = emptyList(),
)

data class ServiceFaq(
    val question: String,
    val answer: String,
    val sortOrder: Int,
)

data class ServiceVariant(
    val id: UUID,
    val durationMinutes: Int,
    val price: Money,
    val active: Boolean,
    val sortOrder: Int,
)

data class PackOffer(
    val id: UUID,
    val durationMinutes: Int,
    val sessionCount: Int,
    val price: Money,
    val validityDays: Int?,
    val active: Boolean,
    val sortOrder: Int,
)
