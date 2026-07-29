package com.byiara.api.guide.infrastructure.persistence

import com.byiara.api.guide.domain.Guide
import com.byiara.api.guide.domain.GuideBlock
import com.byiara.api.guide.domain.GuideBlockType
import com.byiara.api.guide.domain.GuideCommand
import com.byiara.api.guide.domain.GuideContentImageAsset
import com.byiara.api.guide.domain.GuideFaq
import com.byiara.api.guide.domain.GuideImageAsset
import com.byiara.api.guide.domain.GuideImageMetadata
import com.byiara.api.guide.domain.GuideImageType
import com.byiara.api.guide.domain.GuideListQuery
import com.byiara.api.guide.domain.GuideRepository
import com.byiara.api.guide.domain.GuideSort
import com.byiara.api.guide.domain.GuideSortDirection
import com.byiara.api.guide.domain.GuideStatus
import com.byiara.api.guide.domain.GuideTranslation
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.SortField
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.lower
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.noCondition
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqGuideRepository(
    private val dsl: DSLContext,
) : GuideRepository {
    private val guides = table(name("guides"))
    private val gId = field(name("guides", "id"), UUID::class.java)
    private val gStatus = field(name("guides", "status"), String::class.java)
    private val gAuthor = field(name("guides", "author"), String::class.java)
    private val gPublishedAt = field(name("guides", "published_at"), OffsetDateTime::class.java)
    private val gCreatedAt = field(name("guides", "created_at"), OffsetDateTime::class.java)
    private val gUpdatedAt = field(name("guides", "updated_at"), OffsetDateTime::class.java)

    private val translations = table(name("guide_translations"))
    private val gtGuideId = field(name("guide_translations", "guide_id"), UUID::class.java)
    private val gtLocale = field(name("guide_translations", "locale"), String::class.java)
    private val gtSlug = field(name("guide_translations", "slug"), String::class.java)
    private val gtTitle = field(name("guide_translations", "title"), String::class.java)
    private val gtExcerpt = field(name("guide_translations", "excerpt"), String::class.java)
    private val gtSeoTitle = field(name("guide_translations", "seo_title"), String::class.java)
    private val gtMetaDescription = field(name("guide_translations", "meta_description"), String::class.java)

    private val blocks = table(name("guide_blocks"))
    private val gbId = field(name("guide_blocks", "id"), UUID::class.java)
    private val gbGuideId = field(name("guide_blocks", "guide_id"), UUID::class.java)
    private val gbLocale = field(name("guide_blocks", "locale"), String::class.java)
    private val gbType = field(name("guide_blocks", "block_type"), String::class.java)
    private val gbSortOrder = field(name("guide_blocks", "sort_order"), Int::class.java)
    private val gbText = field(name("guide_blocks", "text_content"), String::class.java)
    private val gbHeadingLevel = field(name("guide_blocks", "heading_level"), Int::class.java)
    private val gbImageUrl = field(name("guide_blocks", "image_url"), String::class.java)
    private val gbImageAlt = field(name("guide_blocks", "image_alt"), String::class.java)
    private val gbActionLabel = field(name("guide_blocks", "action_label"), String::class.java)
    private val gbActionUrl = field(name("guide_blocks", "action_url"), String::class.java)

    private val blockItems = table(name("guide_block_items"))
    private val gbiBlockId = field(name("guide_block_items", "block_id"), UUID::class.java)
    private val gbiSortOrder = field(name("guide_block_items", "sort_order"), Int::class.java)
    private val gbiText = field(name("guide_block_items", "text_content"), String::class.java)

    private val faqs = table(name("guide_faqs"))
    private val gfGuideId = field(name("guide_faqs", "guide_id"), UUID::class.java)
    private val gfLocale = field(name("guide_faqs", "locale"), String::class.java)
    private val gfQuestion = field(name("guide_faqs", "question"), String::class.java)
    private val gfAnswer = field(name("guide_faqs", "answer"), String::class.java)
    private val gfSortOrder = field(name("guide_faqs", "sort_order"), Int::class.java)

    private val categories = table(name("guide_categories"))
    private val gcGuideId = field(name("guide_categories", "guide_id"), UUID::class.java)
    private val gcName = field(name("guide_categories", "name"), String::class.java)
    private val tags = table(name("guide_tags"))
    private val gtagGuideId = field(name("guide_tags", "guide_id"), UUID::class.java)
    private val gtagName = field(name("guide_tags", "name"), String::class.java)
    private val relatedServices = table(name("guide_related_services"))
    private val grsGuideId = field(name("guide_related_services", "guide_id"), UUID::class.java)
    private val grsServiceId = field(name("guide_related_services", "service_id"), UUID::class.java)
    private val grsSortOrder = field(name("guide_related_services", "sort_order"), Int::class.java)

    private val images = table(name("guide_images"))
    private val giGuideId = field(name("guide_images", "guide_id"), UUID::class.java)
    private val giMediaAssetId = field(name("guide_images", "media_asset_id"), UUID::class.java)
    private val giType = field(name("guide_images", "image_type"), String::class.java)
    private val giContentType = field(name("guide_images", "content_type"), String::class.java)
    private val giWidth = field(name("guide_images", "width"), Int::class.java)
    private val giHeight = field(name("guide_images", "height"), Int::class.java)
    private val giByteSize = field(name("guide_images", "byte_size"), Int::class.java)
    private val giStorageKey = field(name("guide_images", "storage_key"), String::class.java)
    private val giUpdatedAt = field(name("guide_images", "updated_at"), OffsetDateTime::class.java)

    private val contentImages = table(name("guide_content_images"))
    private val gciId = field(name("guide_content_images", "id"), UUID::class.java)
    private val gciGuideId = field(name("guide_content_images", "guide_id"), UUID::class.java)
    private val gciMediaAssetId = field(name("guide_content_images", "media_asset_id"), UUID::class.java)
    private val gciContentType = field(name("guide_content_images", "content_type"), String::class.java)
    private val gciWidth = field(name("guide_content_images", "width"), Int::class.java)
    private val gciHeight = field(name("guide_content_images", "height"), Int::class.java)
    private val gciByteSize = field(name("guide_content_images", "byte_size"), Int::class.java)
    private val gciStorageKey = field(name("guide_content_images", "storage_key"), String::class.java)
    private val gciContentHash = field(name("guide_content_images", "content_hash"), String::class.java)
    private val gciCreatedAt = field(name("guide_content_images", "created_at"), OffsetDateTime::class.java)

    override fun findAll(query: GuideListQuery): List<Guide> {
        val search = query.search?.trim()?.lowercase()?.takeIf(String::isNotBlank)
        val searchCondition = search?.let {
            lower(gtTitle).like("%${escapeLike(it)}%", '\\')
                .or(lower(gAuthor).like("%${escapeLike(it)}%", '\\'))
                .or(lower(gtSlug).like("%${escapeLike(it)}%", '\\'))
        } ?: noCondition()
        val statusCondition = query.status?.let { gStatus.eq(it.name) } ?: noCondition()
        val records = dsl.select(gId, gStatus, gAuthor, gPublishedAt, gCreatedAt, gUpdatedAt)
            .from(guides)
            .leftJoin(translations)
            .on(gtGuideId.eq(gId).and(gtLocale.eq(PRIMARY_LOCALE)))
            .where(statusCondition.and(searchCondition))
            .orderBy(sortField(query))
            .fetch()
        return hydrate(records, includeContent = false)
    }

    override fun findById(id: UUID): Guide? =
        hydrate(
            dsl.select(gId, gStatus, gAuthor, gPublishedAt, gCreatedAt, gUpdatedAt)
                .from(guides)
                .where(gId.eq(id))
                .fetch(),
        ).firstOrNull()

    override fun findPublished(locale: String): List<Guide> {
        val records = dsl.select(gId, gStatus, gAuthor, gPublishedAt, gCreatedAt, gUpdatedAt)
            .from(guides)
            .join(translations).on(gtGuideId.eq(gId).and(gtLocale.eq(locale)))
            .where(gStatus.eq(GuideStatus.PUBLISHED.name))
            .orderBy(gPublishedAt.desc(), gUpdatedAt.desc())
            .fetch()
        return hydrate(records, includeContent = false)
    }

    override fun findPublishedBySlug(locale: String, slug: String): Guide? {
        val records = dsl.select(gId, gStatus, gAuthor, gPublishedAt, gCreatedAt, gUpdatedAt)
            .from(guides)
            .join(translations).on(gtGuideId.eq(gId).and(gtLocale.eq(locale)))
            .where(gStatus.eq(GuideStatus.PUBLISHED.name).and(gtSlug.eq(slug)))
            .fetch()
        return hydrate(records).firstOrNull()
    }

    override fun slugExists(locale: String, slug: String, excludingId: UUID?): Boolean {
        var condition: Condition = gtLocale.eq(locale).and(gtSlug.eq(slug))
        if (excludingId != null) condition = condition.and(gtGuideId.ne(excludingId))
        return dsl.fetchExists(dsl.selectOne().from(translations).where(condition))
    }

    override fun create(command: GuideCommand): Guide {
        val id = UUID.randomUUID()
        dsl.insertInto(guides)
            .columns(gId, gStatus, gAuthor, gPublishedAt)
            .values(id, command.status.name, command.author, command.publishedAt)
            .execute()
        replaceContent(id, command)
        return findById(id)!!
    }

    override fun update(id: UUID, command: GuideCommand): Guide? {
        val updated = dsl.update(guides)
            .set(gStatus, command.status.name)
            .set(gAuthor, command.author)
            .set(gPublishedAt, command.publishedAt)
            .set(gUpdatedAt, currentOffsetDateTime())
            .where(gId.eq(id))
            .execute()
        if (updated == 0) return null
        dsl.deleteFrom(translations).where(gtGuideId.eq(id)).execute()
        dsl.deleteFrom(categories).where(gcGuideId.eq(id)).execute()
        dsl.deleteFrom(tags).where(gtagGuideId.eq(id)).execute()
        dsl.deleteFrom(relatedServices).where(grsGuideId.eq(id)).execute()
        replaceContent(id, command)
        return findById(id)
    }

    override fun updateStatus(ids: Collection<UUID>, status: GuideStatus): Int {
        var update = dsl.update(guides)
            .set(gStatus, status.name)
            .set(gUpdatedAt, currentOffsetDateTime())
        update = when (status) {
            GuideStatus.PUBLISHED ->
                update.set(gPublishedAt, field("coalesce({0}, current_timestamp)", OffsetDateTime::class.java, gPublishedAt))
            GuideStatus.DRAFT -> update.set(gPublishedAt, null as OffsetDateTime?)
            GuideStatus.ARCHIVED -> update
        }
        return update.where(gId.`in`(ids)).execute()
    }

    override fun saveImage(id: UUID, type: GuideImageType, asset: GuideImageAsset) {
        dsl.insertInto(images)
            .columns(giGuideId, giType, giMediaAssetId, giContentType, giWidth, giHeight, giByteSize, giStorageKey, giUpdatedAt)
            .values(id, type.name, asset.mediaAssetId, asset.contentType, asset.width, asset.height, asset.byteSize, asset.storageKey, asset.updatedAt)
            .onConflict(giGuideId, giType)
            .doUpdate()
            .set(giMediaAssetId, asset.mediaAssetId)
            .set(giContentType, asset.contentType)
            .set(giWidth, asset.width)
            .set(giHeight, asset.height)
            .set(giByteSize, asset.byteSize)
            .set(giStorageKey, asset.storageKey)
            .set(giUpdatedAt, asset.updatedAt)
            .execute()
        dsl.update(guides)
            .set(gUpdatedAt, currentOffsetDateTime())
            .where(gId.eq(id))
            .execute()
    }

    override fun findImage(id: UUID, type: GuideImageType): GuideImageAsset? =
        dsl.select(giMediaAssetId, giStorageKey, giContentType, giWidth, giHeight, giByteSize, giUpdatedAt)
            .from(images)
            .where(giGuideId.eq(id).and(giType.eq(type.name)))
            .fetchOne {
                GuideImageAsset(
                    mediaAssetId = it.get(giMediaAssetId),
                    storageKey = it.get(giStorageKey),
                    contentType = it.get(giContentType),
                    width = it.get(giWidth),
                    height = it.get(giHeight),
                    byteSize = it.get(giByteSize),
                    updatedAt = it.get(giUpdatedAt),
                )
            }

    override fun deleteImage(id: UUID, type: GuideImageType): Boolean =
        (dsl.deleteFrom(images).where(giGuideId.eq(id).and(giType.eq(type.name))).execute() > 0)
            .also { deleted ->
                if (deleted) {
                    dsl.update(guides)
                        .set(gUpdatedAt, currentOffsetDateTime())
                        .where(gId.eq(id))
                        .execute()
                }
            }

    override fun saveContentImage(asset: GuideContentImageAsset) {
        dsl.insertInto(contentImages)
            .columns(
                gciId,
                gciGuideId,
                gciMediaAssetId,
                gciContentType,
                gciWidth,
                gciHeight,
                gciByteSize,
                gciStorageKey,
                gciContentHash,
                gciCreatedAt,
            )
            .values(
                asset.id,
                asset.guideId,
                asset.mediaAssetId,
                asset.contentType,
                asset.width,
                asset.height,
                asset.byteSize,
                asset.storageKey,
                asset.contentHash,
                asset.createdAt,
            )
            .execute()
    }

    override fun findContentImage(guideId: UUID, imageId: UUID): GuideContentImageAsset? =
        dsl.select(
            gciId,
            gciGuideId,
            gciMediaAssetId,
            gciStorageKey,
            gciContentHash,
            gciContentType,
            gciWidth,
            gciHeight,
            gciByteSize,
            gciCreatedAt,
        )
            .from(contentImages)
            .where(gciGuideId.eq(guideId).and(gciId.eq(imageId)))
            .fetchOne(::contentImageAsset)

    override fun findContentImages(guideId: UUID): List<GuideContentImageAsset> =
        dsl.select(
            gciId,
            gciGuideId,
            gciMediaAssetId,
            gciStorageKey,
            gciContentHash,
            gciContentType,
            gciWidth,
            gciHeight,
            gciByteSize,
            gciCreatedAt,
        )
            .from(contentImages)
            .where(gciGuideId.eq(guideId))
            .fetch(::contentImageAsset)

    override fun deleteContentImage(guideId: UUID, imageId: UUID): GuideContentImageAsset? {
        val asset = findContentImage(guideId, imageId) ?: return null
        dsl.deleteFrom(contentImages)
            .where(gciGuideId.eq(guideId).and(gciId.eq(imageId)))
            .execute()
        return asset
    }

    private fun replaceContent(id: UUID, command: GuideCommand) {
        command.translations.forEach { (locale, translation) ->
            dsl.insertInto(translations)
                .columns(gtGuideId, gtLocale, gtSlug, gtTitle, gtExcerpt, gtSeoTitle, gtMetaDescription)
                .values(
                    id,
                    locale,
                    requireNotNull(translation.slug),
                    translation.title,
                    translation.excerpt,
                    translation.seoTitle,
                    translation.metaDescription,
                )
                .execute()
            translation.blocks.forEachIndexed { index, block ->
                val blockId = UUID.randomUUID()
                dsl.insertInto(blocks)
                    .columns(
                        gbId, gbGuideId, gbLocale, gbType, gbSortOrder, gbText, gbHeadingLevel,
                        gbImageUrl, gbImageAlt, gbActionLabel, gbActionUrl,
                    )
                    .values(
                        blockId, id, locale, block.type.name, index, block.text, block.headingLevel,
                        block.imageUrl, block.imageAlt, block.actionLabel, block.actionUrl,
                    )
                    .execute()
                block.items.filter(String::isNotBlank).forEachIndexed { itemIndex, item ->
                    dsl.insertInto(blockItems)
                        .columns(gbiBlockId, gbiSortOrder, gbiText)
                        .values(blockId, itemIndex, item)
                        .execute()
                }
            }
            translation.faqs.forEachIndexed { index, faq ->
                dsl.insertInto(faqs)
                    .columns(gfGuideId, gfLocale, gfQuestion, gfAnswer, gfSortOrder)
                    .values(id, locale, faq.question, faq.answer, index)
                    .execute()
            }
        }
        command.categories.forEach {
            dsl.insertInto(categories).columns(gcGuideId, gcName).values(id, it).execute()
        }
        command.tags.forEach {
            dsl.insertInto(tags).columns(gtagGuideId, gtagName).values(id, it).execute()
        }
        command.relatedServiceIds.forEachIndexed { index, serviceId ->
            dsl.insertInto(relatedServices)
                .columns(grsGuideId, grsServiceId, grsSortOrder)
                .values(id, serviceId, index)
                .execute()
        }
    }

    private fun hydrate(
        baseRecords: List<Record>,
        includeContent: Boolean = true,
    ): List<Guide> {
        if (baseRecords.isEmpty()) return emptyList()
        val ids = baseRecords.map { it.get(gId) }
        val itemRows =
            if (includeContent) {
                dsl.select(gbiBlockId, gbiText)
                    .from(blockItems)
                    .join(blocks).on(gbId.eq(gbiBlockId))
                    .where(gbGuideId.`in`(ids))
                    .orderBy(gbiSortOrder)
                    .fetch()
                    .groupBy({ it.get(gbiBlockId) }, { it.get(gbiText) })
            } else {
                emptyMap()
            }
        val blockRows =
            if (includeContent) {
                dsl.select(
                    gbId, gbGuideId, gbLocale, gbType, gbText, gbHeadingLevel,
                    gbImageUrl, gbImageAlt, gbActionLabel, gbActionUrl,
                )
                    .from(blocks)
                    .where(gbGuideId.`in`(ids))
                    .orderBy(gbSortOrder)
                    .fetch()
                    .groupBy({ it.get(gbGuideId) to it.get(gbLocale) }) { row ->
                        GuideBlock(
                            type = GuideBlockType.valueOf(row.get(gbType)),
                            text = row.get(gbText),
                            headingLevel = row.get(gbHeadingLevel),
                            items = itemRows[row.get(gbId)].orEmpty(),
                            imageUrl = row.get(gbImageUrl),
                            imageAlt = row.get(gbImageAlt),
                            actionLabel = row.get(gbActionLabel),
                            actionUrl = row.get(gbActionUrl),
                        )
                    }
            } else {
                emptyMap()
            }
        val faqRows =
            if (includeContent) {
                dsl.select(gfGuideId, gfLocale, gfQuestion, gfAnswer)
                    .from(faqs)
                    .where(gfGuideId.`in`(ids))
                    .orderBy(gfSortOrder)
                    .fetch()
                    .groupBy({ it.get(gfGuideId) to it.get(gfLocale) }) {
                        GuideFaq(it.get(gfQuestion), it.get(gfAnswer))
                    }
            } else {
                emptyMap()
            }
        val translationRows = dsl.select(
            gtGuideId, gtLocale, gtSlug, gtTitle, gtExcerpt, gtSeoTitle, gtMetaDescription,
        )
            .from(translations)
            .where(gtGuideId.`in`(ids))
            .fetch()
            .groupBy { it.get(gtGuideId) }
        val categoryRows = labelsByGuide(categories, gcGuideId, gcName, ids)
        val tagRows = labelsByGuide(tags, gtagGuideId, gtagName, ids)
        val relatedRows = dsl.select(grsGuideId, grsServiceId)
            .from(relatedServices)
            .where(grsGuideId.`in`(ids))
            .orderBy(grsSortOrder)
            .fetch()
            .groupBy({ it.get(grsGuideId) }, { it.get(grsServiceId) })
        val imageRows = dsl.select(giGuideId, giType, giWidth, giHeight, giByteSize, giUpdatedAt)
            .from(images)
            .where(giGuideId.`in`(ids))
            .fetch()
            .groupBy { it.get(giGuideId) }

        return baseRecords.map { base ->
            val id = base.get(gId)
            Guide(
                id = id,
                status = GuideStatus.valueOf(base.get(gStatus)),
                author = base.get(gAuthor),
                publishedAt = base.get(gPublishedAt),
                createdAt = base.get(gCreatedAt),
                updatedAt = base.get(gUpdatedAt),
                translations = translationRows[id].orEmpty().associate { row ->
                    val locale = row.get(gtLocale)
                    locale to GuideTranslation(
                        slug = row.get(gtSlug),
                        title = row.get(gtTitle),
                        excerpt = row.get(gtExcerpt),
                        seoTitle = row.get(gtSeoTitle),
                        metaDescription = row.get(gtMetaDescription),
                        blocks = blockRows[id to locale].orEmpty(),
                        faqs = faqRows[id to locale].orEmpty(),
                    )
                },
                categories = categoryRows[id].orEmpty(),
                tags = tagRows[id].orEmpty(),
                relatedServiceIds = relatedRows[id].orEmpty(),
                images = imageRows[id].orEmpty().associate { row ->
                    GuideImageType.valueOf(row.get(giType)) to GuideImageMetadata(
                        width = row.get(giWidth),
                        height = row.get(giHeight),
                        byteSize = row.get(giByteSize),
                        updatedAt = row.get(giUpdatedAt),
                    )
                },
            )
        }
    }

    private fun labelsByGuide(
        source: org.jooq.Table<*>,
        guideId: org.jooq.Field<UUID>,
        label: org.jooq.Field<String>,
        ids: List<UUID>,
    ): Map<UUID, List<String>> =
        dsl.select(guideId, label)
            .from(source)
            .where(guideId.`in`(ids))
            .orderBy(label)
            .fetch()
            .groupBy({ it.get(guideId) }, { it.get(label) })

    private fun sortField(query: GuideListQuery): SortField<*> {
        val field = when (query.sort) {
            GuideSort.UPDATED_AT -> gUpdatedAt
            GuideSort.PUBLISHED_AT -> gPublishedAt
            GuideSort.TITLE -> lower(gtTitle)
            GuideSort.STATUS -> gStatus
        }
        return if (query.direction == GuideSortDirection.ASC) field.asc() else field.desc()
    }

    private fun escapeLike(value: String): String =
        value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    private fun contentImageAsset(record: Record): GuideContentImageAsset =
        GuideContentImageAsset(
            id = record.get(gciId),
            guideId = record.get(gciGuideId),
            mediaAssetId = record.get(gciMediaAssetId),
            storageKey = record.get(gciStorageKey),
            contentHash = record.get(gciContentHash),
            contentType = record.get(gciContentType),
            width = record.get(gciWidth),
            height = record.get(gciHeight),
            byteSize = record.get(gciByteSize),
            createdAt = record.get(gciCreatedAt),
        )

    private companion object {
        const val PRIMARY_LOCALE = "pt-PT"
    }
}
