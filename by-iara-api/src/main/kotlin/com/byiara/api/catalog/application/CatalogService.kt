package com.byiara.api.catalog.application

import com.byiara.api.catalog.domain.DuplicateServiceSlugException
import com.byiara.api.catalog.domain.Service
import com.byiara.api.catalog.domain.ServiceCommand
import com.byiara.api.catalog.domain.ServiceNotFoundException
import com.byiara.api.catalog.domain.ServiceRepository
import com.byiara.api.catalog.domain.ServiceListQuery
import com.byiara.api.catalog.domain.InvalidPackOfferException
import org.springframework.stereotype.Service as SpringService
import org.springframework.transaction.annotation.Transactional
import java.text.Normalizer
import java.util.UUID

@SpringService
class CatalogService(
    private val serviceRepository: ServiceRepository,
) {
    @Transactional(readOnly = true)
    fun listPublicCatalog(): List<Service> = serviceRepository.findCatalog()

    @Transactional(readOnly = true)
    fun findPublicByLocalizedSlug(locale: String, slug: String): Service? =
        serviceRepository.findPublicByLocalizedSlug(normalizeLocale(locale), slug)

    @Transactional(readOnly = true)
    fun listAll(query: ServiceListQuery = ServiceListQuery()): List<Service> = serviceRepository.findAll(query)

    @Transactional(readOnly = true)
    fun get(id: UUID): Service =
        serviceRepository.findById(id) ?: throw ServiceNotFoundException(id)

    @Transactional
    fun create(command: ServiceCommand): Service {
        validatePackOffers(command)
        val slug = slugify(command.name)
        if (serviceRepository.existsBySlug(slug)) {
            throw DuplicateServiceSlugException(slug)
        }
        return serviceRepository.create(slug, withLocalizedSlugs(command))
    }

    @Transactional
    fun update(id: UUID, command: ServiceCommand): Service {
        validatePackOffers(command)
        val existing = serviceRepository.findById(id) ?: throw ServiceNotFoundException(id)
        return serviceRepository.update(id, withLocalizedSlugs(command, existing))
    }

    @Transactional
    fun deactivate(id: UUID) {
        if (!serviceRepository.deactivate(id)) {
            throw ServiceNotFoundException(id)
        }
    }

    private fun withLocalizedSlugs(command: ServiceCommand, existing: Service? = null): ServiceCommand =
        command.copy(
            translations = command.translations.mapValues { (locale, translation) ->
                val slug = translation.slug
                    ?.let(::slugify)
                    ?: existing?.translations?.get(locale)?.slug
                    ?: slugify(translation.name)
                if (serviceRepository.existsByLocalizedSlug(locale, slug, existing?.id)) {
                    throw DuplicateServiceSlugException(slug)
                }
                translation.copy(slug = slug)
            },
        )

    private fun slugify(name: String): String =
        Normalizer.normalize(name, Normalizer.Form.NFD)
            .replace(Regex("\\p{M}+"), "")
            .trim()
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')

    private fun normalizeLocale(locale: String): String =
        when (locale.trim()) {
            "pt", "pt-PT" -> "pt-PT"
            "en", "en-US" -> "en-US"
            else -> locale.trim()
        }

    private fun validatePackOffers(command: ServiceCommand) {
        val durations = command.variants.map { it.durationMinutes }.toSet()
        command.packOffers.forEach { offer ->
            if (offer.durationMinutes !in durations) {
                throw InvalidPackOfferException("Every pack must use a duration offered by the service")
            }
            if (offer.sessionCount < 2) {
                throw InvalidPackOfferException("A pack must contain at least two sessions")
            }
        }
        val duplicates = command.packOffers.groupBy { it.durationMinutes to it.sessionCount }.any { it.value.size > 1 }
        if (duplicates) {
            throw InvalidPackOfferException("Pack duration and session count combinations must be unique")
        }
    }
}
