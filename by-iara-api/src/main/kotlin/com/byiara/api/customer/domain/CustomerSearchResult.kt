package com.byiara.api.customer.domain

import com.byiara.api.pack.domain.CustomerPackStatus
import java.time.OffsetDateTime
import java.util.UUID

data class CustomerPackSummary(
    val id: UUID,
    val status: CustomerPackStatus,
    val serviceName: String,
    val durationMinutes: Int,
    val totalSessions: Int,
    val remainingSessions: Int,
    val priceCents: Long,
    val currency: String,
    val expiresAt: OffsetDateTime?,
)

data class CustomerSearchResult(
    val id: UUID,
    val name: String,
    val email: String,
    val phone: String?,
    val reservationCount: Int,
    val completedReservationCount: Int,
    val activeReservationCount: Int,
    val lastCompletedAt: OffsetDateTime?,
    val nextReservationAt: OffsetDateTime?,
    val packs: List<CustomerPackSummary>,
)

data class CustomerSearchPage(
    val items: List<CustomerSearchResult>,
    val page: Int,
    val size: Int,
    val total: Int,
)
