package com.byiara.api.catalog.api

import com.byiara.api.catalog.domain.Service
import com.byiara.api.catalog.domain.ServiceCommand
import com.byiara.api.catalog.domain.ServiceVariant
import com.byiara.api.catalog.domain.VariantCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size
import java.util.UUID

data class ServiceRequest(
    @field:NotBlank
    val name: String,

    val description: String? = null,

    val active: Boolean = true,

    val sortOrder: Int = 0,

    @field:NotEmpty
    @field:Valid
    val variants: List<VariantRequest> = emptyList(),
) {
    fun toCommand(): ServiceCommand =
        ServiceCommand(
            name = name.trim(),
            description = description?.trim()?.ifBlank { null },
            active = active,
            sortOrder = sortOrder,
            variants = variants.map { it.toCommand() },
        )
}

data class VariantRequest(
    @field:Positive
    val durationMinutes: Int,

    @field:PositiveOrZero
    val priceCents: Long,

    @field:Size(min = 3, max = 3)
    val currency: String = "EUR",

    val active: Boolean = true,

    val sortOrder: Int = 0,
) {
    fun toCommand(): VariantCommand =
        VariantCommand(
            durationMinutes = durationMinutes,
            priceCents = priceCents,
            currency = currency.uppercase(),
            active = active,
            sortOrder = sortOrder,
        )
}

data class ServiceResponse(
    val id: UUID,
    val slug: String,
    val name: String,
    val description: String?,
    val active: Boolean,
    val sortOrder: Int,
    val variants: List<ServiceVariantResponse>,
)

data class ServiceVariantResponse(
    val id: UUID,
    val durationMinutes: Int,
    val price: MoneyResponse,
    val active: Boolean,
    val sortOrder: Int,
)

data class MoneyResponse(
    val amountCents: Long,
    val currency: String,
)

fun Service.toResponse(): ServiceResponse =
    ServiceResponse(
        id = id,
        slug = slug,
        name = name,
        description = description,
        active = active,
        sortOrder = sortOrder,
        variants = variants.map { it.toResponse() },
    )

fun ServiceVariant.toResponse(): ServiceVariantResponse =
    ServiceVariantResponse(
        id = id,
        durationMinutes = durationMinutes,
        price = MoneyResponse(price.amountCents, price.currency),
        active = active,
        sortOrder = sortOrder,
    )
