package com.byiara.api.discount.api

import com.byiara.api.discount.domain.CreateDiscountCommand
import com.byiara.api.discount.domain.CreatedDiscount
import com.byiara.api.discount.domain.Discount
import com.byiara.api.discount.domain.DiscountAudience
import com.byiara.api.discount.domain.DiscountScope
import com.byiara.api.discount.domain.DiscountStatus
import com.byiara.api.discount.domain.DiscountUsage
import com.byiara.api.discount.domain.DiscountValueType
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Future
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime
import java.util.UUID

data class CreateDiscountRequest(
    @field:NotBlank @field:Size(max = 160) val name: String,
    @field:NotNull val audience: DiscountAudience?,
    @field:NotNull val scope: DiscountScope?,
    @field:NotNull val valueType: DiscountValueType?,
    @field:Positive val valueAmount: Long?,
    @field:Size(min = 3, max = 3) val currency: String? = null,
    @field:NotNull val startsAt: OffsetDateTime?,
    @field:NotNull @field:Future val endsAt: OffsetDateTime?,
    @field:Positive val maxUniqueClients: Int? = null,
    @field:Positive val maxUsesPerCustomer: Int = 1,
    val serviceIds: Set<UUID> = emptySet(),
    @field:Email @field:Size(max = 255) val customerEmail: String? = null,
    @field:Size(max = 100) val code: String? = null,
    val sendEmail: Boolean = false,
    val featured: Boolean = false,
) {
    fun toCommand() = CreateDiscountCommand(
        name = name,
        audience = audience!!,
        scope = scope!!,
        valueType = valueType!!,
        valueAmount = valueAmount!!,
        currency = currency,
        startsAt = startsAt!!,
        endsAt = endsAt!!,
        maxUniqueClients = maxUniqueClients,
        maxUsesPerCustomer = maxUsesPerCustomer,
        serviceIds = serviceIds,
        customerEmail = customerEmail,
        requestedCode = code,
        featured = featured,
    )
}

data class DiscountResponse(
    val id: UUID,
    val name: String,
    val audience: String,
    val scope: String,
    val valueType: String,
    val valueAmount: Long,
    val currency: String?,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val maxUniqueClients: Int?,
    val maxUsesPerCustomer: Int,
    val codeHint: String,
    val customerEmail: String?,
    val status: String,
    val serviceIds: Set<UUID>,
    val reservedUses: Int,
    val consumedUses: Int,
    val uniqueClients: Int,
    val publicCode: String?,
    val featured: Boolean,
)

data class CreatedDiscountResponse(
    val discount: DiscountResponse,
    val generatedCode: String?,
    val deliveryStatus: String? = null,
)

data class UpdateDiscountStatusRequest(@field:NotNull val status: DiscountStatus?)
data class UpdateFeaturedDiscountRequest(val featured: Boolean)

data class FeaturedDiscountResponse(
    val name: String,
    val code: String,
    val valueType: String,
    val valueAmount: Long,
    val currency: String?,
    val endsAt: OffsetDateTime,
)

data class DiscountUsageResponse(
    val id: UUID,
    val reservationId: UUID,
    val customerName: String,
    val customerEmail: String,
    val serviceName: String,
    val originalPriceCents: Long,
    val discountAmountCents: Long,
    val finalPriceCents: Long,
    val currency: String,
    val status: String,
    val reservedAt: OffsetDateTime,
    val consumedAt: OffsetDateTime?,
    val releasedAt: OffsetDateTime?,
)

fun Discount.toResponse() = DiscountResponse(
    id, name, audience.name, scope.name, valueType.name, valueAmount, currency, startsAt, endsAt,
    maxUniqueClients, maxUsesPerCustomer, codeHint, customerEmail, status.name, serviceIds,
    reservedUses, consumedUses, uniqueClients, publicCode, featured,
)

fun Discount.toFeaturedResponse() = FeaturedDiscountResponse(
    name, requireNotNull(publicCode), valueType.name, valueAmount, currency, endsAt,
)

fun CreatedDiscount.toResponse(deliveryStatus: String? = null) =
    CreatedDiscountResponse(discount.toResponse(), generatedCode, deliveryStatus)

fun DiscountUsage.toResponse() = DiscountUsageResponse(
    id, reservationId, customerName, customerEmail, serviceName, originalPriceCents,
    discountAmountCents, finalPriceCents, currency, status.name, reservedAt, consumedAt, releasedAt,
)
