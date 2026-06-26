package com.byiara.api.catalog.domain

import java.util.UUID

interface ServiceRepository {
    /** Active services with their active variants — for the public catalog. */
    fun findCatalog(): List<Service>

    /** All services with all variants — for admin management. */
    fun findAll(): List<Service>

    fun findById(id: UUID): Service?

    fun existsBySlug(slug: String): Boolean

    fun create(slug: String, command: ServiceCommand): Service

    fun update(id: UUID, command: ServiceCommand): Service

    /** Soft-delete: marks the service inactive. Returns false if it did not exist. */
    fun deactivate(id: UUID): Boolean
}
