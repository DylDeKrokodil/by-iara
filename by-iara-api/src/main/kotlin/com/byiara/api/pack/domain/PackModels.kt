package com.byiara.api.pack.domain

import com.byiara.api.catalog.domain.Money
import java.time.OffsetDateTime
import java.util.UUID

enum class CustomerPackStatus { PENDING_PAYMENT, ACTIVE, EXHAUSTED, EXPIRED, CANCELLED }
enum class PackRedemptionStatus { RESERVED, CONSUMED, RELEASED, FORFEITED }

data class CustomerPack(
    val id: UUID,
    val customerId: UUID,
    val customerName: String,
    val customerEmail: String,
    val packOfferId: UUID?,
    val originatingReservationId: UUID,
    val status: CustomerPackStatus,
    val serviceId: UUID?,
    val serviceName: String,
    val durationMinutes: Int,
    val totalSessions: Int,
    val remainingSessions: Int,
    val price: Money,
    val validityDays: Int?,
    val activatedAt: OffsetDateTime?,
    val expiresAt: OffsetDateTime?,
)

data class NewCustomerPack(
    val customerId: UUID,
    val packOfferId: UUID,
    val originatingReservationId: UUID,
    val serviceId: UUID,
    val serviceName: String,
    val durationMinutes: Int,
    val totalSessions: Int,
    val price: Money,
    val validityDays: Int?,
)

class PackNotAvailableException(message: String) : RuntimeException(message)
class CustomerAccessDeniedException : RuntimeException("The customer access session is invalid or expired")
