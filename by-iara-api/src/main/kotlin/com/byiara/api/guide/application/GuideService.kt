package com.byiara.api.guide.application

import com.byiara.api.guide.domain.DuplicateGuideSlugException
import com.byiara.api.guide.domain.Guide
import com.byiara.api.guide.domain.GuideBlockType
import org.jsoup.Jsoup
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
                validatePublishable(guide.author, guide.translations.mapValues { (_, translation) ->
                    GuideTranslationCommand(
                        slug = translation.slug,
                        title = translation.title,
                        excerpt = translation.excerpt,
                        seoTitle = translation.seoTitle,
                        metaDescription = translation.metaDescription,
                        blocks = translation.blocks,
                        faqs = translation.faqs,
                    )
                })
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
        if ((command.translations.keys - SUPPORTED_LOCALES).isNotEmpty()) {
            throw InvalidGuideException("Unsupported guide locale")
        }
        SUPPORTED_LOCALES.forEach { locale ->
            command.translations[locale]?.blocks?.forEach { block ->
                if (block.type == GuideBlockType.RICH_TEXT && (block.text?.length ?: 0) > 200_000) {
                    throw InvalidGuideException("${localeName(locale)} guide content must be 200,000 characters or fewer")
                }
            }
        }
        if (command.status == GuideStatus.PUBLISHED) validatePublishable(command.author, command.translations)
        if (
            command.status == GuideStatus.PUBLISHED &&
            command.publishedAt?.isAfter(OffsetDateTime.now()) == true
        ) {
            throw InvalidGuideException("Published date cannot be in the future")
        }

        val translations = SUPPORTED_LOCALES.associateWith { locale ->
            val translation = command.translations[locale] ?: emptyTranslation()
            val language = localeName(locale)
            val requestedSlug = translation.slug?.let(::slugify)?.takeIf(String::isNotBlank)
                ?: slugify(translation.title).takeIf(String::isNotBlank)
            val needsDraftSlug = command.status != GuideStatus.PUBLISHED && (
                requestedSlug == null || requestedSlug.length > 140 ||
                    repository.slugExists(locale, requestedSlug, existingId)
            )
            val slug = if (needsDraftSlug) "draft-${existingId ?: UUID.randomUUID()}" else requestedSlug
                ?: throw InvalidGuideException("$language URL slug needs letters or numbers")
            if (slug.length > 140) throw InvalidGuideException("$language URL slug must be 140 characters or fewer")
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

    private fun emptyTranslation() = GuideTranslationCommand(
        slug = null,
        title = "",
        excerpt = "",
        seoTitle = "",
        metaDescription = "",
        blocks = emptyList(),
        faqs = emptyList(),
    )

    private fun validatePublishable(author: String, translations: Map<String, GuideTranslationCommand>) {
        if (author.isBlank()) throw InvalidGuideException("Enter an author before publishing")
        SUPPORTED_LOCALES.forEach { locale ->
            val language = localeName(locale)
            val translation = translations[locale]
                ?: throw InvalidGuideException("Add $language content before publishing")
            if (translation.title.isBlank()) throw InvalidGuideException("Enter the $language title")
            if (translation.excerpt.isBlank()) throw InvalidGuideException("Enter the $language summary")
            if (translation.blocks.isEmpty()) throw InvalidGuideException("Enter the $language guide content")
            validateBlocks(translation, language)
            if (translation.seoTitle.isBlank()) throw InvalidGuideException("Enter the $language SEO title")
            if (translation.metaDescription.isBlank()) throw InvalidGuideException("Enter the $language meta description")
            translation.faqs.forEachIndexed { index, faq ->
                if (faq.question.isBlank()) throw InvalidGuideException("$language FAQ ${index + 1}: enter a question")
                if (faq.answer.isBlank()) throw InvalidGuideException("$language FAQ ${index + 1}: enter an answer")
            }
        }
    }

    private fun validateBlocks(translation: GuideTranslationCommand, language: String) {
        translation.blocks.forEachIndexed { index, block ->
            when (block.type) {
                GuideBlockType.RICH_TEXT -> {
                    val document = Jsoup.parseBodyFragment(block.text.orEmpty())
                    if (document.body().text().isBlank() && document.select("img[src]").isEmpty()) {
                        throw InvalidGuideException("Enter the $language guide content")
                    }
                    if (document.select("img[src]").any { it.attr("alt").isBlank() }) {
                        throw InvalidGuideException("Add alt text to each $language guide image")
                    }
                }
                GuideBlockType.PARAGRAPH, GuideBlockType.QUOTE ->
                    if (block.text.isNullOrBlank()) invalidBlock(language, index, "enter ${block.type.name.lowercase()} text")
                GuideBlockType.HEADING -> {
                    if (block.text.isNullOrBlank()) invalidBlock(language, index, "enter heading text")
                    if (block.headingLevel !in 2..4) invalidBlock(language, index, "choose H2, H3, or H4")
                }
                GuideBlockType.IMAGE -> {
                    if (block.imageUrl.isNullOrBlank()) invalidBlock(language, index, "choose an image or enter an image URL")
                    if (block.imageAlt.isNullOrBlank()) invalidBlock(language, index, "enter image alt text")
                }
                GuideBlockType.LIST ->
                    if (block.items.none { it.isNotBlank() }) invalidBlock(language, index, "enter at least one list item")
                GuideBlockType.CALL_TO_ACTION -> {
                    if (block.actionLabel.isNullOrBlank()) invalidBlock(language, index, "enter a button label")
                    if (block.actionUrl.isNullOrBlank()) invalidBlock(language, index, "enter a destination URL")
                }
            }
        }
    }

    private fun invalidBlock(language: String, index: Int, message: String): Nothing =
        throw InvalidGuideException("$language content block ${index + 1}: $message")

    private fun localeName(locale: String): String = if (locale == "pt-PT") "Portuguese" else "English"

    private fun cleanLabels(values: List<String>): List<String> =
        values.map(String::trim).filter(String::isNotBlank).distinctBy(String::lowercase)

    private fun deleteUnreferencedContentImages(guideId: UUID, command: GuideCommand) {
        val expectedPrefix = "/api/guides/images/content/$guideId/"
        val referencedIds = command.translations.values
            .flatMap { it.blocks }
            .flatMap { block ->
                if (block.type == GuideBlockType.RICH_TEXT) {
                    Jsoup.parseBodyFragment(block.text.orEmpty()).select("img[src]").map { it.attr("src") }
                } else listOfNotNull(block.imageUrl)
            }
            .mapNotNull { imageUrl ->
                imageUrl
                    .takeIf { it.startsWith(expectedPrefix) }
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
