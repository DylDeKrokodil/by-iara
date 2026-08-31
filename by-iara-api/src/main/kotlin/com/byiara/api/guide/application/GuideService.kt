package com.byiara.api.guide.application

import com.byiara.api.guide.domain.DuplicateGuideSlugException
import com.byiara.api.guide.domain.Guide
import com.byiara.api.guide.domain.GuideBlockType
import com.byiara.api.guide.domain.GuideCommand
import com.byiara.api.guide.domain.GuideContentImageAsset
import com.byiara.api.guide.domain.GuideImageAsset
import com.byiara.api.guide.domain.GuideImageType
import com.byiara.api.guide.domain.GuideListQuery
import com.byiara.api.guide.domain.GuideNotFoundException
import com.byiara.api.guide.domain.GuideRepository
import com.byiara.api.guide.domain.GuideStatus
import com.byiara.api.guide.domain.GuideTranslationCommand
import com.byiara.api.guide.domain.InvalidGuideException
import com.byiara.api.guide.domain.StoredGuideImage
import com.byiara.api.common.storage.MediaStorage
import com.byiara.api.media.application.MediaService
import com.byiara.api.media.domain.MediaAsset
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.text.Normalizer
import java.time.OffsetDateTime
import java.util.UUID

@Service
class GuideService(
    private val repository: GuideRepository,
    private val mediaService: MediaService,
    private val mediaStorage: MediaStorage,
) {
    @Transactional(readOnly = true)
    fun listAdmin(query: GuideListQuery): List<Guide> = repository.findAll(query)

    @Transactional(readOnly = true)
    fun getAdmin(id: UUID): Guide = repository.findById(id) ?: throw GuideNotFoundException(id)

    @Transactional(readOnly = true)
    fun hasPublished(): Boolean = repository.hasPublished()

    @Transactional(readOnly = true)
    fun listPublished(locale: String): List<Guide> = repository.findPublished(normalizeLocale(locale))

    @Transactional(readOnly = true)
    fun findPublished(locale: String, slug: String): Guide? =
        repository.findPublishedBySlug(normalizeLocale(locale), slug)

    @Transactional
    fun create(command: GuideCommand): Guide {
        val normalized = normalizeAndValidate(command)
        return repository.create(normalized)
    }

    @Transactional
    fun update(id: UUID, command: GuideCommand): Guide {
        if (repository.findById(id) == null) throw GuideNotFoundException(id)
        val normalized = normalizeAndValidate(command, id)
        val updated = repository.update(id, normalized) ?: throw GuideNotFoundException(id)
        deleteUnreferencedContentImages(id, normalized)
        return updated
    }

    @Transactional
    fun changeStatus(ids: Collection<UUID>, status: GuideStatus) {
        if (ids.isEmpty()) throw InvalidGuideException("Select at least one guide")
        if (status == GuideStatus.PUBLISHED) {
            ids.distinct().forEach { id ->
                val guide = repository.findById(id) ?: throw GuideNotFoundException(id)
                if (
                    (SUPPORTED_LOCALES - guide.translations.keys).isNotEmpty() ||
                    guide.translations.values.any { it.blocks.isEmpty() }
                ) {
                    throw InvalidGuideException(
                        "Both languages need complete content before publishing",
                    )
                }
            }
        }
        repository.updateStatus(ids.distinct(), status)
    }

    @Transactional
    fun saveImage(id: UUID, type: GuideImageType, input: ByteArray): Guide {
        if (repository.findById(id) == null) throw GuideNotFoundException(id)
        return useImage(id, type, mediaService.store(input).id)
    }

    @Transactional
    fun useImage(id: UUID, type: GuideImageType, mediaAssetId: UUID): Guide {
        if (repository.findById(id) == null) throw GuideNotFoundException(id)
        val image = mediaService.requireAsset(mediaAssetId)
        repository.saveImage(
            id,
            type,
            GuideImageAsset(
                mediaAssetId = image.id,
                storageKey = image.storageKey,
                contentType = image.contentType,
                width = image.width,
                height = image.height,
                byteSize = image.byteSize,
                updatedAt = OffsetDateTime.now(),
            ),
        )
        return getAdmin(id)
    }

    @Transactional(readOnly = true)
    fun getImage(id: UUID, type: GuideImageType): StoredGuideImage? {
        val asset = repository.findImage(id, type) ?: return null
        val data = mediaStorage.read(asset.storageKey) ?: return null
        return StoredGuideImage(asset.contentType, data, asset.updatedAt)
    }

    @Transactional(readOnly = true)
    fun getPublicImage(id: UUID, type: GuideImageType): StoredGuideImage? {
        val guide = repository.findById(id) ?: return null
        if (guide.status != GuideStatus.PUBLISHED) return null
        return getImage(id, type)
    }

    @Transactional
    fun deleteImage(id: UUID, type: GuideImageType) {
        if (repository.findById(id) == null) throw GuideNotFoundException(id)
        repository.deleteImage(id, type)
    }

    @Transactional
    fun saveContentImage(guideId: UUID, input: ByteArray): GuideContentImageAsset {
        if (repository.findById(guideId) == null) throw GuideNotFoundException(guideId)
        return createContentImageReference(guideId, mediaService.store(input))
    }

    @Transactional
    fun useContentImage(guideId: UUID, mediaAssetId: UUID): GuideContentImageAsset {
        if (repository.findById(guideId) == null) throw GuideNotFoundException(guideId)
        return createContentImageReference(guideId, mediaService.requireAsset(mediaAssetId))
    }

    private fun createContentImageReference(guideId: UUID, image: MediaAsset): GuideContentImageAsset {
        val asset = GuideContentImageAsset(
            id = UUID.randomUUID(),
            guideId = guideId,
            mediaAssetId = image.id,
            storageKey = image.storageKey,
            contentHash = image.contentHash,
            contentType = image.contentType,
            width = image.width,
            height = image.height,
            byteSize = image.byteSize,
            createdAt = OffsetDateTime.now(),
        )
        repository.saveContentImage(asset)
        return asset
    }

    @Transactional(readOnly = true)
    fun getContentImage(guideId: UUID, imageId: UUID, publicOnly: Boolean): StoredGuideImage? {
        if (publicOnly && repository.findById(guideId)?.status != GuideStatus.PUBLISHED) return null
        val asset = repository.findContentImage(guideId, imageId) ?: return null
        val data = mediaStorage.read(asset.storageKey) ?: return null
        return StoredGuideImage(asset.contentType, data, asset.createdAt)
    }

    @Transactional
    fun deleteContentImage(guideId: UUID, imageId: UUID) {
        if (repository.findById(guideId) == null) throw GuideNotFoundException(guideId)
        repository.deleteContentImage(guideId, imageId)
    }

    private fun normalizeAndValidate(command: GuideCommand, existingId: UUID? = null): GuideCommand {
        val missingLocales = SUPPORTED_LOCALES - command.translations.keys
        if (missingLocales.isNotEmpty()) {
            throw InvalidGuideException("Portuguese and English content are required")
        }
        if (command.status == GuideStatus.PUBLISHED && command.translations.values.any { it.blocks.isEmpty() }) {
            throw InvalidGuideException("Both languages need at least one content block before publishing")
        }
        if (
            command.status == GuideStatus.PUBLISHED &&
            command.publishedAt?.isAfter(OffsetDateTime.now()) == true
        ) {
            throw InvalidGuideException("Published date cannot be in the future")
        }

        val translations = command.translations.mapValues { (locale, translation) ->
            validateBlocks(translation)
            val slug = translation.slug?.let(::slugify)?.ifBlank { null } ?: slugify(translation.title)
            if (repository.slugExists(locale, slug, existingId)) {
                throw DuplicateGuideSlugException(locale, slug)
            }
            translation.copy(slug = slug)
        }
        val publishedAt = when {
            command.status == GuideStatus.PUBLISHED && command.publishedAt == null -> OffsetDateTime.now()
            command.status == GuideStatus.DRAFT -> null
            else -> command.publishedAt
        }
        return command.copy(
            author = command.author.trim(),
            publishedAt = publishedAt,
            translations = translations,
            categories = cleanLabels(command.categories),
            tags = cleanLabels(command.tags),
            relatedServiceIds = command.relatedServiceIds.distinct(),
        )
    }

    private fun validateBlocks(translation: GuideTranslationCommand) {
        translation.blocks.forEachIndexed { index, block ->
            when (block.type) {
                GuideBlockType.PARAGRAPH, GuideBlockType.QUOTE ->
                    if (block.text.isNullOrBlank()) invalidBlock(index, "needs text")
                GuideBlockType.HEADING -> {
                    if (block.text.isNullOrBlank()) invalidBlock(index, "needs text")
                    if (block.headingLevel !in 2..4) invalidBlock(index, "needs a heading level from 2 to 4")
                }
                GuideBlockType.IMAGE -> {
                    if (block.imageUrl.isNullOrBlank()) invalidBlock(index, "needs an image URL")
                    if (block.imageAlt.isNullOrBlank()) invalidBlock(index, "needs image alt text")
                }
                GuideBlockType.LIST ->
                    if (block.items.none { it.isNotBlank() }) invalidBlock(index, "needs at least one item")
                GuideBlockType.CALL_TO_ACTION -> {
                    if (block.actionLabel.isNullOrBlank()) invalidBlock(index, "needs a label")
                    if (block.actionUrl.isNullOrBlank()) invalidBlock(index, "needs a URL")
                }
            }
        }
    }

    private fun invalidBlock(index: Int, message: String): Nothing =
        throw InvalidGuideException("Content block ${index + 1} $message")

    private fun cleanLabels(values: List<String>): List<String> =
        values.map(String::trim).filter(String::isNotBlank).distinctBy(String::lowercase)

    private fun deleteUnreferencedContentImages(guideId: UUID, command: GuideCommand) {
        val expectedPrefix = "/api/guides/images/content/$guideId/"
        val referencedIds = command.translations.values
            .flatMap { it.blocks }
            .mapNotNull { block ->
                block.imageUrl
                    ?.takeIf { it.startsWith(expectedPrefix) }
                    ?.removePrefix(expectedPrefix)
                    ?.substringBefore('?')
                    ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
            }
            .toSet()
        repository.findContentImages(guideId)
            .filterNot { it.id in referencedIds }
            .forEach { asset ->
                repository.deleteContentImage(guideId, asset.id)
            }
    }

    private fun slugify(value: String): String =
        Normalizer.normalize(value, Normalizer.Form.NFD)
            .replace(Regex("\\p{M}+"), "")
            .trim()
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
            .also { if (it.isBlank()) throw InvalidGuideException("Guide titles must produce a valid URL slug") }

    private fun normalizeLocale(locale: String): String =
        when (locale.trim()) {
            "pt", "pt-PT" -> "pt-PT"
            "en", "en-US" -> "en-US"
            else -> throw InvalidGuideException("Unsupported guide locale")
        }

    private companion object {
        val SUPPORTED_LOCALES = setOf("pt-PT", "en-US")
    }
}
