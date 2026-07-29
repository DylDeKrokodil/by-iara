package com.byiara.api.common.storage

import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.S3Exception

class S3ObjectStorage(
    private val client: S3Client,
    private val bucket: String,
    keyPrefix: String,
) {
    private val prefix = keyPrefix.trim().trim('/')

    init {
        require(bucket.isNotBlank()) { "S3 media bucket must be configured" }
    }

    fun write(key: String, data: ByteArray) {
        client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey(key))
                .contentLength(data.size.toLong())
                .build(),
            RequestBody.fromBytes(data),
        )
    }

    fun read(key: String): ByteArray? =
        try {
            client.getObjectAsBytes(
                GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey(key))
                    .build(),
            ).asByteArray()
        } catch (exception: S3Exception) {
            if (exception.statusCode() == 404) null else throw exception
        }

    fun delete(key: String) {
        client.deleteObject(
            DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey(key))
                .build(),
        )
    }

    internal fun objectKey(key: String): String {
        val normalized = key.trim()
        require(normalized.isNotBlank()) { "Media storage key cannot be blank" }
        require(!normalized.startsWith('/')) { "Media storage key must be relative" }
        require('\\' !in normalized) { "Media storage key cannot contain backslashes" }
        require(normalized.split('/').none { it.isBlank() || it == "." || it == ".." }) {
            "Invalid media storage key"
        }
        return if (prefix.isBlank()) normalized else "$prefix/$normalized"
    }
}
