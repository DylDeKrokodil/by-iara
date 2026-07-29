package com.byiara.api.media.application

import com.byiara.api.common.storage.MediaStorage
import com.byiara.api.media.domain.MediaAsset
import com.byiara.api.media.domain.MediaAssetOverview
import com.byiara.api.media.domain.MediaRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus
import java.security.MessageDigest
import java.time.OffsetDateTime
import java.util.UUID

@Service
class MediaService(
    private val repository: MediaRepository,
    private val processor: MediaImageProcessor,
    private val storage: MediaStorage,
) {
    @Transactional(readOnly = true)
    fun list(): List<MediaAssetOverview> = repository.findAll()

    @Transactional
    fun store(input: ByteArray): MediaAsset {
        val image = processor.optimize(input)
        val hash = image.data.sha256()
        repository.findByHash(hash)?.let { return it }

        val asset = MediaAsset(
            id = UUID.randomUUID(),
            contentHash = hash,
            contentType = image.contentType,
            width = image.width,
            height = image.height,
            byteSize = image.data.size,
            storageKey = "media/${hash.take(2)}/$hash.jpg",
            createdAt = OffsetDateTime.now(),
        )
        storage.write(asset.storageKey, image.data)
        repository.save(asset)
        return repository.findByHash(hash) ?: asset
    }

    @Transactional(readOnly = true)
    fun requireAsset(id: UUID): MediaAsset =
        repository.findById(id) ?: throw MediaAssetNotFoundException(id)

    @Transactional(readOnly = true)
    fun read(id: UUID): Pair<MediaAsset, ByteArray>? {
        val asset = repository.findById(id) ?: return null
        return storage.read(asset.storageKey)?.let { asset to it }
    }

    private fun ByteArray.sha256(): String =
        MessageDigest.getInstance("SHA-256")
            .digest(this)
            .joinToString("") { byte -> "%02x".format(byte) }
}

@ResponseStatus(HttpStatus.NOT_FOUND)
class MediaAssetNotFoundException(id: UUID) : RuntimeException("Media asset $id was not found")
