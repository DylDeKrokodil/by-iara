package com.byiara.api.notification.domain

import java.time.OffsetDateTime
import java.util.UUID

enum class EmailType {
    NEW_RESERVATION,
    RESERVATION_CONFIRMED,
    RESERVATION_REJECTED,
    RESERVATION_CANCELLED,
    RESERVATION_COMPLETED,
    PERSONAL_DISCOUNT,
    CUSTOMER_PACK_ACCESS,
}

enum class EmailStatus {
    SENT,
    FAILED,
}

data class EmailLog(
    val id: UUID,
    val reservationId: UUID?,
    val recipient: String,
    val emailType: EmailType,
    val status: EmailStatus,
    val errorMessage: String?,
    val createdAt: OffsetDateTime,
)

data class NewEmailLog(
    val reservationId: UUID?,
    val recipient: String,
    val emailType: EmailType,
    val status: EmailStatus,
    val errorMessage: String?,
)
