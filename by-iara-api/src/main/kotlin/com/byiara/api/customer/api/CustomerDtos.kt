package com.byiara.api.customer.api

import com.byiara.api.customer.domain.CustomerSearchPage
import com.byiara.api.customer.domain.CustomerSearchResult
import com.byiara.api.customer.domain.CustomerPackSummary
import java.time.OffsetDateTime
import java.util.UUID

data class CustomerPackSummaryResponse(
    val id: UUID,
    val status: String,
    val serviceName: String,
    val durationMinutes: Int,
    val totalSessions: Int,
    val remainingSessions: Int,
    val priceCents: Long,
    val currency: String,
    val expiresAt: OffsetDateTime?,
)

data class CustomerSearchResultResponse(
    val id: UUID,
    val name: String,
    val email: String,
    val phone: String?,
    val reservationCount: Int,
    val completedReservationCount: Int,
    val activeReservationCount: Int,
    val lastCompletedAt: OffsetDateTime?,
    val nextReservationAt: OffsetDateTime?,
    val packs: List<CustomerPackSummaryResponse>,
)

data class CustomerSearchPageResponse(
    val items: List<CustomerSearchResultResponse>,
    val page: Int,
    val size: Int,
    val total: Int,
)

fun CustomerSearchResult.toResponse() = CustomerSearchResultResponse(
    id = id,
    name = name,
    email = email,
    phone = phone,
    reservationCount = reservationCount,
    completedReservationCount = completedReservationCount,
    activeReservationCount = activeReservationCount,
    lastCompletedAt = lastCompletedAt,
    nextReservationAt = nextReservationAt,
    packs = packs.map(CustomerPackSummary::toResponse),
)

fun CustomerPackSummary.toResponse() = CustomerPackSummaryResponse(
    id = id,
    status = status.name,
    serviceName = serviceName,
    durationMinutes = durationMinutes,
    totalSessions = totalSessions,
    remainingSessions = remainingSessions,
    priceCents = priceCents,
    currency = currency,
    expiresAt = expiresAt,
)

fun CustomerSearchPage.toResponse() = CustomerSearchPageResponse(
    items = items.map(CustomerSearchResult::toResponse),
    page = page,
    size = size,
    total = total,
)
