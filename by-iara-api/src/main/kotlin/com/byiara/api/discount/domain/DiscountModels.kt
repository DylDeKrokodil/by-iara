package com.byiara.api.discount.domain

import com.byiara.api.catalog.domain.Money
import java.time.OffsetDateTime
import java.util.UUID

enum class DiscountAudience { PUBLIC, PERSONAL }
enum class DiscountScope { ALL_SERVICES, SELECTED_SERVICES }
enum class DiscountValueType { PERCENTAGE, FIXED_AMOUNT }
enum class DiscountStatus { ACTIVE, PAUSED, ARCHIVED }
enum class DiscountUsageStatus { RESERVED, CONSUMED, RELEASED }

data class Discount(
    val id: UUID,
    val name: String,
    val audience: DiscountAudience,
    val scope: DiscountScope,
    val valueType: DiscountValueType,
    val valueAmount: Long,
    val currency: String?,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val maxUniqueClients: Int?,
    val maxUsesPerCustomer: Int,
    val codeHint: String,
    val customerId: UUID?,
    val customerEmail: String?,
    val status: DiscountStatus,
    val serviceIds: Set<UUID>,
    val reservedUses: Int = 0,
    val consumedUses: Int = 0,
    val uniqueClients: Int = 0,
    val publicCode: String? = null,
    val featured: Boolean = false,
)

data class CreateDiscountCommand(
    val name: String,
    val audience: DiscountAudience,
    val scope: DiscountScope,
    val valueType: DiscountValueType,
    val valueAmount: Long,
    val currency: String?,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val maxUniqueClients: Int?,
    val maxUsesPerCustomer: Int,
    val serviceIds: Set<UUID>,
    val customerEmail: String?,
    val requestedCode: String?,
    val featured: Boolean = false,
)

data class NewDiscount(
    val command: CreateDiscountCommand,
    val codeHash: String,
    val codeHint: String,
    val customerId: UUID?,
    val publicCode: String? = null,
    val featured: Boolean = false,
)

data class DiscountQuote(
    val discountId: UUID,
    val discountName: String,
    val codeHint: String,
    val valueType: DiscountValueType,
    val valueAmount: Long,
    val originalPrice: Money,
    val discountAmount: Money,
    val finalPrice: Money,
)

data class DiscountUsage(
    val id: UUID,
    val reservationId: UUID,
    val customerName: String,
    val customerEmail: String,
    val serviceName: String,
    val discountName: String,
    val originalPriceCents: Long,
    val discountAmountCents: Long,
    val finalPriceCents: Long,
    val currency: String,
    val status: DiscountUsageStatus,
    val reservedAt: OffsetDateTime,
    val consumedAt: OffsetDateTime?,
    val releasedAt: OffsetDateTime?,
)

data class DiscountRecipient(
    val customerId: UUID,
    val name: String,
    val email: String,
    val locale: String,
    val reservationId: UUID,
)

data class CreatedDiscount(
    val discount: Discount,
    val generatedCode: String?,
    val recipient: DiscountRecipient? = null,
)

class DiscountUnavailableException : RuntimeException("This discount code is invalid or unavailable")
class InvalidDiscountException(message: String) : RuntimeException(message)
class DiscountNotFoundException(id: UUID) : RuntimeException("Discount $id was not found")
