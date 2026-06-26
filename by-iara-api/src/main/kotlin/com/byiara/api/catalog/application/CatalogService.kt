package com.byiara.api.catalog.application

import com.byiara.api.catalog.domain.DuplicateServiceSlugException
import com.byiara.api.catalog.domain.Service
import com.byiara.api.catalog.domain.ServiceCommand
import com.byiara.api.catalog.domain.ServiceNotFoundException
import com.byiara.api.catalog.domain.ServiceRepository
import org.springframework.stereotype.Service as SpringService
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringService
class CatalogService(
    private val serviceRepository: ServiceRepository,
) {
    @Transactional(readOnly = true)
    fun listPublicCatalog(): List<Service> = serviceRepository.findCatalog()

    @Transactional(readOnly = true)
    fun listAll(): List<Service> = serviceRepository.findAll()

    @Transactional(readOnly = true)
    fun get(id: UUID): Service =
        serviceRepository.findById(id) ?: throw ServiceNotFoundException(id)

    @Transactional
    fun create(command: ServiceCommand): Service {
        val slug = slugify(command.name)
        if (serviceRepository.existsBySlug(slug)) {
            throw DuplicateServiceSlugException(slug)
        }
        return serviceRepository.create(slug, command)
    }

    @Transactional
    fun update(id: UUID, command: ServiceCommand): Service {
        if (serviceRepository.findById(id) == null) {
            throw ServiceNotFoundException(id)
        }
        return serviceRepository.update(id, command)
    }

    @Transactional
    fun deactivate(id: UUID) {
        if (!serviceRepository.deactivate(id)) {
            throw ServiceNotFoundException(id)
        }
    }

    private fun slugify(name: String): String =
        name.trim()
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
}
