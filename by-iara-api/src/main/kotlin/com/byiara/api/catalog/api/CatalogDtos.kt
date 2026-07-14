package com.byiara.api.catalog.api

import com.byiara.api.catalog.domain.Service
import com.byiara.api.catalog.domain.ServiceCommand
import com.byiara.api.catalog.domain.ServiceTranslation
import com.byiara.api.catalog.domain.ServiceTranslationCommand
import com.byiara.api.catalog.domain.ServiceVariant
import com.byiara.api.catalog.domain.VariantCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Pattern
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

    val featured: Boolean = false,

    val translations: Map<String, @Valid ServiceTranslationRequest> = emptyMap(),

    @field:NotEmpty
    @field:Valid
    val variants: List<VariantRequest> = emptyList(),
) {
    fun toCommand(): ServiceCommand {
        val normalizedName = name.trim()
        val normalizedDescription = description?.trim()?.ifBlank { null }
        val normalizedTranslations = translations
            .mapNotNull { (locale, translation) ->
                val normalizedLocale = normalizeLocale(locale) ?: return@mapNotNull null
                normalizedLocale to translation.toCommand()
            }
            .toMap()
            .ifEmpty {
                mapOf(PRIMARY_LOCALE to ServiceTranslationCommand(normalizedName, normalizedDescription))
            }

        return ServiceCommand(
            name = normalizedName,
            description = normalizedDescription,
            active = active,
            sortOrder = sortOrder,
            featured = featured,
            translations = normalizedTranslations,
            variants = variants.map { it.toCommand() },
        )
    }
}

data class ServiceTranslationRequest(
    @field:Size(max = 140)
    @field:Pattern(
        regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        message = "must contain lowercase letters, numbers, and single hyphens only",
    )
    val slug: String? = null,

    @field:NotBlank
    val name: String,

    val description: String? = null,
) {
    fun toCommand(): ServiceTranslationCommand =
        ServiceTranslationCommand(
            slug = slug?.trim()?.ifBlank { null },
            name = name.trim(),
            description = description?.trim()?.ifBlank { null },
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
    val featured: Boolean,
    val translations: Map<String, ServiceTranslationResponse>,
    val variants: List<ServiceVariantResponse>,
)

data class ServiceTranslationResponse(
    val slug: String,
    val name: String,
    val description: String?,
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
        featured = featured,
        translations = translations.mapValues { it.value.toResponse() },
        variants = variants.map { it.toResponse() },
    )

fun ServiceTranslation.toResponse(): ServiceTranslationResponse =
    ServiceTranslationResponse(
        slug = slug,
        name = name,
        description = description,
    )

fun ServiceVariant.toResponse(): ServiceVariantResponse =
    ServiceVariantResponse(
        id = id,
        durationMinutes = durationMinutes,
        price = MoneyResponse(price.amountCents, price.currency),
        active = active,
        sortOrder = sortOrder,
    )

private const val PRIMARY_LOCALE = "pt-PT"

private fun normalizeLocale(locale: String): String? =
    when (locale.trim()) {
        "pt", "pt-PT" -> "pt-PT"
        "en", "en-US" -> "en-US"
        else -> null
    }
