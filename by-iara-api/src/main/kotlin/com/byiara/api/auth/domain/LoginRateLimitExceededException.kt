package com.byiara.api.auth.domain

class LoginRateLimitExceededException(
    val retryAfterSeconds: Long,
) : RuntimeException("Too many login attempts. Try again later")
