package com.byiara.api.catalog.domain

import java.util.UUID

interface ServiceRepository {
    /** Active services with their active variants — for the public catalog. */
    fun findCatalog(): List<Service>

    fun findPublicByLocalizedSlug(locale: String, slug: String): Service?

    /** All services with all variants — filtered and sorted in the database for admin management. */
    fun findAll(query: ServiceListQuery = ServiceListQuery()): List<Service>

    fun findById(id: UUID): Service?

    fun existsBySlug(slug: String): Boolean

    fun existsByLocalizedSlug(locale: String, slug: String, excludingServiceId: UUID? = null): Boolean

    fun create(slug: String, command: ServiceCommand): Service

    fun update(id: UUID, command: ServiceCommand): Service

    fun saveImage(
        id: UUID,
        storageKey: String,
        contentType: String,
        width: Int,
        height: Int,
        byteSize: Int,
    )

    fun findImageAsset(id: UUID): ServiceImageAsset?

    fun deleteImage(id: UUID): Boolean

    /** Soft-delete: marks the service inactive. Returns false if it did not exist. */
    fun deactivate(id: UUID): Boolean
}

enum class ServiceSort {
    DISPLAY_ORDER,
    NAME,
    DURATION,
    PRICE,
}

enum class SortDirection {
    ASC,
    DESC,
}

data class ServiceListQuery(
    val active: Boolean? = null,
    val search: String? = null,
    val sort: ServiceSort = ServiceSort.DISPLAY_ORDER,
    val direction: SortDirection = SortDirection.ASC,
)
