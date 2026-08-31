package com.byiara.api.common.storage

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "by-iara.media.s3")
data class S3MediaStorageProperties(
    val endpoint: String = "",
    val region: String = "eu-central",
    val bucket: String = "",
    val accessKey: String = "",
    val secretKey: String = "",
    val pathStyleAccess: Boolean = false,
    val keyPrefix: String = "",
)
