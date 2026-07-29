package com.byiara.api.media.infrastructure

import com.byiara.api.media.domain.MediaAsset
import com.byiara.api.media.domain.MediaAssetOverview
import com.byiara.api.media.domain.MediaRepository
import com.byiara.api.media.domain.MediaUsageType
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqMediaRepository(
    private val dsl: DSLContext,
) : MediaRepository {
    private val assets = table(name("media_assets"))
    private val id = field(name("media_assets", "id"), UUID::class.java)
    private val hash = field(name("media_assets", "content_hash"), String::class.java)
    private val contentType = field(name("media_assets", "content_type"), String::class.java)
    private val width = field(name("media_assets", "width"), Int::class.java)
    private val height = field(name("media_assets", "height"), Int::class.java)
    private val byteSize = field(name("media_assets", "byte_size"), Int::class.java)
    private val storageKey = field(name("media_assets", "storage_key"), String::class.java)
    private val createdAt = field(name("media_assets", "created_at"), OffsetDateTime::class.java)
    private val hashVerified = field(name("media_assets", "hash_verified"), Boolean::class.java)

    override fun findAll(): List<MediaAssetOverview> {
        val usage = dsl.resultQuery(
            """
            select media_asset_id, count(*) usage_count, string_agg(distinct usage_type, ',') usage_types
            from (
                select media_asset_id, 'SERVICE' usage_type from service_images
                union all
                select media_asset_id, 'GUIDE_IMAGE' usage_type from guide_images
                union all
                select media_asset_id, 'GUIDE_CONTENT' usage_type from guide_content_images
            ) usage_refs
            group by media_asset_id
            """.trimIndent(),
        ).fetch().associate { record ->
            val assetId = record.get("media_asset_id", UUID::class.java)
            val count = record.get("usage_count", Long::class.java).toInt()
            val types = record.get("usage_types", String::class.java)
                .split(',')
                .filter(String::isNotBlank)
                .map(MediaUsageType::valueOf)
                .toSet()
            assetId to (count to types)
        }

        return dsl.select(id, hash, contentType, width, height, byteSize, storageKey, createdAt)
            .from(assets)
            .orderBy(createdAt.desc())
            .fetch()
            .map { record ->
                val asset = toAsset(record)
                val assetUsage = usage[asset.id]
                MediaAssetOverview(asset, assetUsage?.first ?: 0, assetUsage?.second.orEmpty())
            }
    }

    override fun findById(id: UUID): MediaAsset? =
        dsl.select(this.id, hash, contentType, width, height, byteSize, storageKey, createdAt)
            .from(assets)
            .where(this.id.eq(id))
            .fetchOne(::toAsset)

    override fun findUnverified(): List<MediaAsset> =
        dsl.select(id, hash, contentType, width, height, byteSize, storageKey, createdAt)
            .from(assets)
            .where(hashVerified.eq(false))
            .orderBy(createdAt.asc(), id.asc())
            .fetch(::toAsset)

    override fun findByHash(contentHash: String): MediaAsset? =
        dsl.select(id, hash, contentType, width, height, byteSize, storageKey, createdAt)
            .from(assets)
            .where(hash.eq(contentHash))
            .fetchOne(::toAsset)

    override fun save(asset: MediaAsset) {
        dsl.insertInto(assets)
            .columns(id, hash, contentType, width, height, byteSize, storageKey, createdAt)
            .values(
                asset.id,
                asset.contentHash,
                asset.contentType,
                asset.width,
                asset.height,
                asset.byteSize,
                asset.storageKey,
                asset.createdAt,
            )
            .onConflict(hash)
            .doNothing()
            .execute()
    }

    override fun verifyHash(id: UUID, contentHash: String) {
        dsl.update(assets)
            .set(hash, contentHash)
            .set(hashVerified, true)
            .where(this.id.eq(id))
            .execute()
        dsl.update(table(name("guide_content_images")))
            .set(field(name("content_hash"), String::class.java), contentHash)
            .where(field(name("media_asset_id"), UUID::class.java).eq(id))
            .execute()
    }

    override fun replaceReferences(duplicate: MediaAsset, canonical: MediaAsset) {
        replaceReferencesIn("service_images", duplicate.id, canonical)
        replaceReferencesIn("guide_images", duplicate.id, canonical)
        replaceReferencesIn("guide_content_images", duplicate.id, canonical, includeHash = true)
    }

    override fun delete(id: UUID) {
        dsl.deleteFrom(assets).where(this.id.eq(id)).execute()
    }

    private fun replaceReferencesIn(
        tableName: String,
        duplicateId: UUID,
        canonical: MediaAsset,
        includeHash: Boolean = false,
    ) {
        val references = table(name(tableName))
        var update = dsl.update(references)
            .set(field(name("media_asset_id"), UUID::class.java), canonical.id)
            .set(field(name("storage_key"), String::class.java), canonical.storageKey)
            .set(field(name("content_type"), String::class.java), canonical.contentType)
            .set(field(name("width"), Int::class.java), canonical.width)
            .set(field(name("height"), Int::class.java), canonical.height)
            .set(field(name("byte_size"), Int::class.java), canonical.byteSize)
        if (includeHash) {
            update = update.set(
                field(name("content_hash"), String::class.java),
                canonical.contentHash,
            )
        }
        update.where(field(name("media_asset_id"), UUID::class.java).eq(duplicateId)).execute()
    }

    private fun toAsset(record: Record): MediaAsset =
        MediaAsset(
            id = record.get(id),
            contentHash = record.get(hash),
            contentType = record.get(contentType),
            width = record.get(width),
            height = record.get(height),
            byteSize = record.get(byteSize),
            storageKey = record.get(storageKey),
            createdAt = record.get(createdAt),
        )
}
