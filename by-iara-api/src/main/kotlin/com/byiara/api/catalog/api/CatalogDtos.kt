package com.byiara.api.catalog.api

import com.byiara.api.catalog.domain.Service
import com.byiara.api.catalog.domain.ServiceCommand
import com.byiara.api.catalog.domain.ServiceFaq
import com.byiara.api.catalog.domain.ServiceFaqCommand
import com.byiara.api.catalog.domain.ServiceTranslation
import com.byiara.api.catalog.domain.ServiceTranslationCommand
import com.byiara.api.catalog.domain.ServiceVariant
import com.byiara.api.catalog.domain.VariantCommand
import com.byiara.api.catalog.domain.PackOffer
import com.byiara.api.catalog.domain.PackOfferCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime
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

    @field:Valid
    val packOffers: List<PackOfferRequest> = emptyList(),
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
            packOffers = packOffers.mapIndexed { index, offer -> offer.toCommand(index) },
        )
    }
}

data class PackOfferRequest(
    @field:Positive
    val durationMinutes: Int,
    @field:Positive
    val sessionCount: Int,
    @field:Positive
    val priceCents: Long,
    @field:Size(min = 3, max = 3)
    val currency: String = "EUR",
    @field:Positive
    val validityDays: Int? = null,
    val active: Boolean = true,
    val sortOrder: Int = 0,
) {
    fun toCommand(index: Int): PackOfferCommand = PackOfferCommand(
        durationMinutes = durationMinutes,
        sessionCount = sessionCount,
        priceCents = priceCents,
        currency = currency.uppercase(),
        validityDays = validityDays,
        active = active,
        sortOrder = sortOrder.takeIf { it >= 0 } ?: index,
    )
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

    val treatmentDescription: String? = null,

    val suitableFor: String? = null,

    val sessionDescription: String? = null,

    @field:Valid
    val faqs: List<ServiceFaqRequest> = emptyList(),
) {
    fun toCommand(): ServiceTranslationCommand =
        ServiceTranslationCommand(
            slug = slug?.trim()?.ifBlank { null },
            name = name.trim(),
            description = description?.trim()?.ifBlank { null },
            treatmentDescription = treatmentDescription?.trim()?.ifBlank { null },
            suitableFor = suitableFor?.trim()?.ifBlank { null },
            sessionDescription = sessionDescription?.trim()?.ifBlank { null },
            faqs = faqs.mapIndexed { index, faq -> faq.toCommand(index) },
        )
}

data class ServiceFaqRequest(
    @field:NotBlank
    val question: String,

    @field:NotBlank
    val answer: String,
) {
    fun toCommand(sortOrder: Int): ServiceFaqCommand =
        ServiceFaqCommand(
            question = question.trim(),
            answer = answer.trim(),
            sortOrder = sortOrder,
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
    val image: ServiceImageResponse?,
    val translations: Map<String, ServiceTranslationResponse>,
    val variants: List<ServiceVariantResponse>,
    val packOffers: List<PackOfferResponse>,
    val updatedAt: OffsetDateTime,
)

data class ServiceImageResponse(
    val url: String,
    val width: Int,
    val height: Int,
    val byteSize: Int,
)

data class ServiceTranslationResponse(
    val slug: String,
    val name: String,
    val description: String?,
    val treatmentDescription: String?,
    val suitableFor: String?,
    val sessionDescription: String?,
    val faqs: List<ServiceFaqResponse>,
)

data class ServiceFaqResponse(
    val question: String,
    val answer: String,
)

data class ServiceVariantResponse(
    val id: UUID,
    val durationMinutes: Int,
    val price: MoneyResponse,
    val active: Boolean,
    val sortOrder: Int,
)

data class PackOfferResponse(
    val id: UUID,
    val durationMinutes: Int,
    val sessionCount: Int,
    val price: MoneyResponse,
    val validityDays: Int?,
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
        image = image?.let {
            ServiceImageResponse(
                url = "/api/services/$id/image?v=${it.updatedAt.toInstant().toEpochMilli()}",
                width = it.width,
                height = it.height,
                byteSize = it.byteSize,
            )
        },
        translations = translations.mapValues { it.value.toResponse() },
        variants = variants.map { it.toResponse() },
        packOffers = packOffers.map { it.toResponse() },
        updatedAt = maxOf(updatedAt, image?.updatedAt ?: updatedAt),
    )

fun ServiceTranslation.toResponse(): ServiceTranslationResponse =
    ServiceTranslationResponse(
        slug = slug,
        name = name,
        description = description,
        treatmentDescription = treatmentDescription,
        suitableFor = suitableFor,
        sessionDescription = sessionDescription,
        faqs = faqs.map { it.toResponse() },
    )

fun ServiceFaq.toResponse(): ServiceFaqResponse =
    ServiceFaqResponse(
        question = question,
        answer = answer,
    )

fun ServiceVariant.toResponse(): ServiceVariantResponse =
    ServiceVariantResponse(
        id = id,
        durationMinutes = durationMinutes,
        price = MoneyResponse(price.amountCents, price.currency),
        active = active,
        sortOrder = sortOrder,
    )

fun PackOffer.toResponse(): PackOfferResponse = PackOfferResponse(
    id = id,
    durationMinutes = durationMinutes,
    sessionCount = sessionCount,
    price = MoneyResponse(price.amountCents, price.currency),
    validityDays = validityDays,
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
