package com.byiara.api.common.storage

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component

@Component
@ConditionalOnProperty(prefix = "by-iara.media", name = ["provider"], havingValue = "s3")
class S3MediaStorage(
    private val objectStorage: S3ObjectStorage,
) : MediaStorage {
    override fun write(key: String, data: ByteArray) = objectStorage.write(key, data)
    override fun read(key: String): ByteArray? = objectStorage.read(key)
    override fun delete(key: String) = objectStorage.delete(key)
}
