package com.byiara.api.common.api

import java.time.OffsetDateTime

data class ApiErrorResponse(
    val message: String,
    val timestamp: OffsetDateTime = OffsetDateTime.now(),
)
