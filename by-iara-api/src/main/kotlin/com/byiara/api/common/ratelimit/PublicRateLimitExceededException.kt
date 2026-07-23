package com.byiara.api.common.ratelimit

class PublicRateLimitExceededException(
    val retryAfterSeconds: Long,
) : RuntimeException("Too many requests. Try again later")
