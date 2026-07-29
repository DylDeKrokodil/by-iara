package com.byiara.api.common.storage

import org.junit.jupiter.api.Test
import software.amazon.awssdk.core.ResponseBytes
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectResponse
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectResponse
import software.amazon.awssdk.services.s3.model.S3Exception
import java.lang.reflect.Proxy
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class S3ObjectStorageTests {
    private val storage = S3ObjectStorage(
        client = erroringClient(),
        bucket = "media",
        keyPrefix = "/production/",
    )

    @Test
    fun `prefixes valid relative object keys`() {
        assertEquals(
            "production/guides/guide-id/cover.jpg",
            storage.objectKey("guides/guide-id/cover.jpg"),
        )
    }

    @Test
    fun `rejects unsafe or ambiguous object keys`() {
        listOf("", "/guides/image.jpg", "guides//image.jpg", "guides/../image.jpg", "guides\\image.jpg")
            .forEach { key ->
                assertFailsWith<IllegalArgumentException> { storage.objectKey(key) }
            }
    }

    @Test
    fun `writes reads and deletes objects in the configured bucket and prefix`() {
        val requests = mutableListOf<Any>()
        val expected = "optimized-image".toByteArray()
        val client = client { method, arguments ->
            when (method) {
                "putObject" -> {
                    requests.add(requireNotNull(arguments[0]))
                    val body = arguments[1] as RequestBody
                    assertContentEquals(expected, body.contentStreamProvider().newStream().use { it.readBytes() })
                    PutObjectResponse.builder().build()
                }
                "getObjectAsBytes" -> {
                    requests.add(requireNotNull(arguments[0]))
                    ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), expected)
                }
                "deleteObject" -> {
                    requests.add(requireNotNull(arguments[0]))
                    DeleteObjectResponse.builder().build()
                }
                else -> error("Unexpected S3 call: $method")
            }
        }
        val objectStorage = S3ObjectStorage(client, "media-bucket", "production")

        objectStorage.write("guides/id/image.jpg", expected)
        assertContentEquals(expected, objectStorage.read("guides/id/image.jpg"))
        objectStorage.delete("guides/id/image.jpg")

        val put = requests[0] as PutObjectRequest
        val get = requests[1] as GetObjectRequest
        val delete = requests[2] as DeleteObjectRequest
        assertEquals("media-bucket", put.bucket())
        assertEquals("production/guides/id/image.jpg", put.key())
        assertEquals(put.key(), get.key())
        assertEquals(put.key(), delete.key())
    }

    @Test
    fun `returns null only when S3 reports a missing object`() {
        val missingClient = client { method, _ ->
            if (method == "getObjectAsBytes") {
                throw S3Exception.builder().statusCode(404).message("Not found").build()
            }
            error("Unexpected S3 call: $method")
        }
        val objectStorage = S3ObjectStorage(missingClient, "media", "")

        assertNull(objectStorage.read("guides/missing.jpg"))
    }

    private fun erroringClient(): S3Client =
        client { method, _ -> error("Unexpected S3 call: $method") }

    private fun client(call: (String, Array<out Any?>) -> Any): S3Client =
        Proxy.newProxyInstance(
            javaClass.classLoader,
            arrayOf(S3Client::class.java),
        ) { _, method, arguments ->
            when (method.name) {
                "serviceName" -> "s3"
                "close" -> Unit
                else -> call(method.name, arguments ?: emptyArray())
            }
        } as S3Client
}
