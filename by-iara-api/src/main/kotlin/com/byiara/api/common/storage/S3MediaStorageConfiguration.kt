package com.byiara.api.common.storage

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI

@Configuration
@ConditionalOnProperty(prefix = "by-iara.media", name = ["provider"], havingValue = "s3")
class S3MediaStorageConfiguration {
    @Bean(destroyMethod = "close")
    fun mediaS3Client(properties: S3MediaStorageProperties): S3Client {
        require(properties.endpoint.isNotBlank()) { "S3 media endpoint must be configured" }
        require(properties.region.isNotBlank()) { "S3 media region must be configured" }
        require(properties.bucket.isNotBlank()) { "S3 media bucket must be configured" }
        require(properties.accessKey.isBlank() == properties.secretKey.isBlank()) {
            "S3 media access key and secret key must either both be configured or both be omitted"
        }
        val endpoint = URI.create(properties.endpoint)
        require(endpoint.isAbsolute && endpoint.scheme in setOf("http", "https")) {
            "S3 media endpoint must be an absolute HTTP(S) URL"
        }

        val credentialsProvider =
            if (properties.accessKey.isNotBlank()) {
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(properties.accessKey, properties.secretKey),
                )
            } else {
                DefaultCredentialsProvider.builder().build()
            }

        return S3Client.builder()
            .endpointOverride(endpoint)
            .region(Region.of(properties.region))
            .credentialsProvider(credentialsProvider)
            .httpClientBuilder(UrlConnectionHttpClient.builder())
            .forcePathStyle(properties.pathStyleAccess)
            .build()
    }

    @Bean
    fun s3ObjectStorage(
        mediaS3Client: S3Client,
        properties: S3MediaStorageProperties,
    ): S3ObjectStorage = S3ObjectStorage(mediaS3Client, properties.bucket, properties.keyPrefix)
}
