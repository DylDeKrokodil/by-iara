package com.byiara.api.catalog.infrastructure.persistence

import com.byiara.api.catalog.domain.Money
import com.byiara.api.catalog.domain.Service
import com.byiara.api.catalog.domain.ServiceCommand
import com.byiara.api.catalog.domain.ServiceFaq
import com.byiara.api.catalog.domain.ServiceFaqCommand
import com.byiara.api.catalog.domain.ServiceRepository
import com.byiara.api.catalog.domain.ServiceListQuery
import com.byiara.api.catalog.domain.ServiceSort
import com.byiara.api.catalog.domain.SortDirection
import com.byiara.api.catalog.domain.ServiceTranslation
import com.byiara.api.catalog.domain.ServiceTranslationCommand
import com.byiara.api.catalog.domain.ServiceVariant
import com.byiara.api.catalog.domain.VariantCommand
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.SortField
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.min
import org.jooq.impl.DSL.noCondition
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.text.Normalizer
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqServiceRepository(
    private val dsl: DSLContext,
) : ServiceRepository {
    private val services = table(name("services"))
    private val sId = field(name("id"), UUID::class.java)
    private val sSlug = field(name("slug"), String::class.java)
    private val sName = field(name("name"), String::class.java)
    private val sDescription = field(name("description"), String::class.java)
    private val sActive = field(name("active"), Boolean::class.java)
    private val sSortOrder = field(name("sort_order"), Int::class.java)
    private val sFeatured = field(name("featured"), Boolean::class.java)
    private val sUpdatedAt = field(name("updated_at"), OffsetDateTime::class.java)

    private val variants = table(name("service_variants"))
    private val vId = field(name("id"), UUID::class.java)
    private val vServiceId = field(name("service_id"), UUID::class.java)
    private val vDuration = field(name("duration_minutes"), Int::class.java)
    private val vPriceCents = field(name("price_cents"), Long::class.java)
    private val vCurrency = field(name("currency"), String::class.java)
    private val vActive = field(name("active"), Boolean::class.java)
    private val vSortOrder = field(name("sort_order"), Int::class.java)

    private val serviceTranslations = table(name("service_translations"))
    private val stServiceId = field(name("service_id"), UUID::class.java)
    private val stLocale = field(name("locale"), String::class.java)
    private val stSlug = field(name("slug"), String::class.java)
    private val stName = field(name("name"), String::class.java)
    private val stDescription = field(name("description"), String::class.java)
    private val stTreatmentDescription = field(name("treatment_description"), String::class.java)
    private val stSuitableFor = field(name("suitable_for"), String::class.java)
    private val stSessionDescription = field(name("session_description"), String::class.java)

    private val serviceFaqs = table(name("service_faqs"))
    private val sfServiceId = field(name("service_id"), UUID::class.java)
    private val sfLocale = field(name("locale"), String::class.java)
    private val sfQuestion = field(name("question"), String::class.java)
    private val sfAnswer = field(name("answer"), String::class.java)
    private val sfSortOrder = field(name("sort_order"), Int::class.java)

    override fun findCatalog(): List<Service> = loadServices(activeFilter = true, variantsActiveOnly = true)

    override fun findPublicByLocalizedSlug(locale: String, slug: String): Service? {
        val record = dsl
            .select(sId, sSlug, sName, sDescription, sActive, sSortOrder, sFeatured)
            .from(services)
            .where(
                sActive.isTrue
                    .and(
                        sId.`in`(
                            dsl.select(stServiceId)
                                .from(serviceTranslations)
                                .where(stLocale.eq(locale).and(stSlug.equalIgnoreCase(slug))),
                        ),
                    ),
            )
            .fetchOne()
            ?: return null

        val id = record.get(sId)
        return mapService(
            record,
            loadVariants(listOf(id), activeOnly = true).map { it.variant },
            loadTranslations(listOf(id))[id].orEmpty(),
        )
    }

    override fun findAll(query: ServiceListQuery): List<Service> =
        loadServices(activeFilter = query.active, variantsActiveOnly = false, adminQuery = query)

    override fun findById(id: UUID): Service? {
        val record = dsl
            .select(sId, sSlug, sName, sDescription, sActive, sSortOrder, sFeatured)
            .from(services)
            .where(sId.eq(id))
            .fetchOne()
            ?: return null

        return mapService(
            record,
            loadVariants(listOf(id), activeOnly = false).map { it.variant },
            loadTranslations(listOf(id))[id].orEmpty(),
        )
    }

    override fun existsBySlug(slug: String): Boolean =
        dsl.fetchExists(dsl.selectOne().from(services).where(sSlug.equalIgnoreCase(slug)))

    override fun existsByLocalizedSlug(locale: String, slug: String, excludingServiceId: UUID?): Boolean =
        dsl.fetchExists(
            dsl.selectOne()
                .from(serviceTranslations)
                .where(
                    stLocale.eq(locale)
                        .and(stSlug.equalIgnoreCase(slug))
                        .and(excludingServiceId?.let { stServiceId.ne(it) } ?: noCondition()),
                ),
        )

    override fun create(slug: String, command: ServiceCommand): Service {
        val newId = dsl
            .insertInto(services)
            .columns(sSlug, sName, sDescription, sActive, sSortOrder, sFeatured)
            .values(slug, command.name, command.description, command.active, command.sortOrder, command.featured)
            .returning(sId)
            .fetchOne()!!
            .get(sId)

        insertVariants(newId, command.variants)
        insertTranslations(newId, command.translations)

        return findById(newId)!!
    }

    override fun update(id: UUID, command: ServiceCommand): Service {
        dsl.update(services)
            .set(sName, command.name)
            .set(sDescription, command.description)
            .set(sActive, command.active)
            .set(sSortOrder, command.sortOrder)
            .set(sFeatured, command.featured)
            .set(sUpdatedAt, currentOffsetDateTime())
            .where(sId.eq(id))
            .execute()

        // Variants are owned by the service; replace them wholesale on update.
        dsl.deleteFrom(variants).where(vServiceId.eq(id)).execute()
        insertVariants(id, command.variants)

        dsl.deleteFrom(serviceTranslations).where(stServiceId.eq(id)).execute()
        insertTranslations(id, command.translations)

        return findById(id)!!
    }

    override fun deactivate(id: UUID): Boolean =
        dsl.update(services)
            .set(sActive, false)
            .set(sUpdatedAt, currentOffsetDateTime())
            .where(sId.eq(id))
            .execute() > 0

    private fun insertVariants(serviceId: UUID, commands: List<VariantCommand>) {
        commands.forEach { variant ->
            dsl.insertInto(variants)
                .columns(vServiceId, vDuration, vPriceCents, vCurrency, vActive, vSortOrder)
                .values(
                    serviceId,
                    variant.durationMinutes,
                    variant.priceCents,
                    variant.currency,
                    variant.active,
                    variant.sortOrder,
                )
                .execute()
        }
    }

    private fun insertTranslations(serviceId: UUID, commands: Map<String, ServiceTranslationCommand>) {
        commands.forEach { (locale, translation) ->
            dsl.insertInto(serviceTranslations)
                .columns(
                    stServiceId,
                    stLocale,
                    stSlug,
                    stName,
                    stDescription,
                    stTreatmentDescription,
                    stSuitableFor,
                    stSessionDescription,
                )
                .values(
                    serviceId,
                    locale,
                    requireNotNull(translation.slug),
                    translation.name,
                    translation.description,
                    translation.treatmentDescription,
                    translation.suitableFor,
                    translation.sessionDescription,
                )
                .execute()
            insertFaqs(serviceId, locale, translation.faqs)
        }
    }

    private fun insertFaqs(serviceId: UUID, locale: String, faqs: List<ServiceFaqCommand>) {
        faqs.forEach { faq ->
            dsl.insertInto(serviceFaqs)
                .columns(sfServiceId, sfLocale, sfQuestion, sfAnswer, sfSortOrder)
                .values(serviceId, locale, faq.question, faq.answer, faq.sortOrder)
                .execute()
        }
    }

    private fun loadServices(
        activeFilter: Boolean?,
        variantsActiveOnly: Boolean,
        adminQuery: ServiceListQuery? = null,
    ): List<Service> {
        val variantStats = dsl
            .select(
                vServiceId.`as`("stats_service_id"),
                min(vDuration).`as`("min_duration"),
                min(vPriceCents).`as`("min_price"),
            )
            .from(variants)
            .where(vActive.isTrue)
            .groupBy(vServiceId)
            .asTable("variant_stats")
        val statsServiceId = variantStats.field("stats_service_id", UUID::class.java)!!
        val minDuration = variantStats.field("min_duration", Int::class.java)!!
        val minPrice = variantStats.field("min_price", Long::class.java)!!

        val activeCondition = when (activeFilter) {
            true -> sActive.isTrue
            false -> sActive.isFalse
            null -> noCondition()
        }
        val searchCondition = adminQuery?.search
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.let { search ->
                sName.containsIgnoreCase(search)
                    .or(sSlug.containsIgnoreCase(search))
                    .or(
                        sId.`in`(
                            dsl.select(stServiceId)
                                .from(serviceTranslations)
                                .where(
                                    stName.containsIgnoreCase(search)
                                        .or(stSlug.containsIgnoreCase(search)),
                                ),
                        ),
                    )
            }
            ?: noCondition()
        val orderBy = adminQuery
            ?.let { serviceOrderBy(it, minDuration, minPrice) }
            ?: listOf(sSortOrder.asc(), sName.asc())

        val records = dsl
            .select(sId, sSlug, sName, sDescription, sActive, sSortOrder, sFeatured)
            .from(services)
            .leftJoin(variantStats)
            .on(sId.eq(statsServiceId))
            .where(activeCondition.and(searchCondition))
            .orderBy(orderBy)
            .fetch()

        if (records.isEmpty()) {
            return emptyList()
        }

        val variantsByService = loadVariants(records.map { it.get(sId) }, variantsActiveOnly)
            .groupBy { it.serviceId }
        val translationsByService = loadTranslations(records.map { it.get(sId) })

        return records.map { record ->
            mapService(
                record,
                variantsByService[record.get(sId)].orEmpty().map { it.variant },
                translationsByService[record.get(sId)].orEmpty(),
            )
        }
    }

    private fun serviceOrderBy(
        query: ServiceListQuery,
        minDuration: org.jooq.Field<Int>,
        minPrice: org.jooq.Field<Long>,
    ): List<SortField<*>> {
        val primary = when (query.sort) {
            ServiceSort.DISPLAY_ORDER -> when (query.direction) {
                SortDirection.ASC -> sSortOrder.asc()
                SortDirection.DESC -> sSortOrder.desc()
            }
            ServiceSort.NAME -> when (query.direction) {
                SortDirection.ASC -> sName.asc()
                SortDirection.DESC -> sName.desc()
            }
            ServiceSort.DURATION -> when (query.direction) {
                SortDirection.ASC -> minDuration.asc().nullsLast()
                SortDirection.DESC -> minDuration.desc().nullsLast()
            }
            ServiceSort.PRICE -> when (query.direction) {
                SortDirection.ASC -> minPrice.asc().nullsLast()
                SortDirection.DESC -> minPrice.desc().nullsLast()
            }
        }

        return listOf(primary, sName.asc(), sId.asc())
    }

    private fun loadTranslations(serviceIds: List<UUID>): Map<UUID, Map<String, ServiceTranslation>> {
        if (serviceIds.isEmpty()) {
            return emptyMap()
        }

        val faqs = loadFaqs(serviceIds)
        return dsl
            .select(
                stServiceId,
                stLocale,
                stSlug,
                stName,
                stDescription,
                stTreatmentDescription,
                stSuitableFor,
                stSessionDescription,
            )
            .from(serviceTranslations)
            .where(stServiceId.`in`(serviceIds))
            .fetch()
            .groupBy { it.get(stServiceId) }
            .mapValues { (_, records) ->
                records.associate { record ->
                    record.get(stLocale) to ServiceTranslation(
                        slug = record.get(stSlug) ?: fallbackSlug(record.get(stName)),
                        name = record.get(stName),
                        description = record.get(stDescription),
                        treatmentDescription = record.get(stTreatmentDescription),
                        suitableFor = record.get(stSuitableFor),
                        sessionDescription = record.get(stSessionDescription),
                        faqs = faqs[TranslationKey(record.get(stServiceId), record.get(stLocale))].orEmpty(),
                    )
                }
            }
    }

    private fun loadFaqs(serviceIds: List<UUID>): Map<TranslationKey, List<ServiceFaq>> =
        dsl.select(sfServiceId, sfLocale, sfQuestion, sfAnswer, sfSortOrder)
            .from(serviceFaqs)
            .where(sfServiceId.`in`(serviceIds))
            .orderBy(sfServiceId.asc(), sfLocale.asc(), sfSortOrder.asc())
            .fetch()
            .groupBy { TranslationKey(it.get(sfServiceId), it.get(sfLocale)) }
            .mapValues { (_, records) ->
                records.map { record ->
                    ServiceFaq(
                        question = record.get(sfQuestion),
                        answer = record.get(sfAnswer),
                        sortOrder = record.get(sfSortOrder),
                    )
                }
            }

    private fun fallbackSlug(value: String): String =
        Normalizer.normalize(value, Normalizer.Form.NFD)
            .replace(Regex("\\p{M}+"), "")
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')

    private fun loadVariants(serviceIds: List<UUID>, activeOnly: Boolean): List<OwnedVariant> {
        if (serviceIds.isEmpty()) {
            return emptyList()
        }

        return dsl
            .select(vId, vServiceId, vDuration, vPriceCents, vCurrency, vActive, vSortOrder)
            .from(variants)
            .where(vServiceId.`in`(serviceIds).and(if (activeOnly) vActive.isTrue else noCondition()))
            .orderBy(vSortOrder.asc(), vDuration.asc())
            .fetch()
            .map { record ->
                OwnedVariant(
                    serviceId = record.get(vServiceId),
                    variant = mapVariant(record),
                )
            }
    }

    private fun mapService(
        record: Record,
        variants: List<ServiceVariant>,
        translations: Map<String, ServiceTranslation>,
    ): Service =
        Service(
            id = record.get(sId),
            slug = record.get(sSlug),
            name = record.get(sName),
            description = record.get(sDescription),
            active = record.get(sActive),
            sortOrder = record.get(sSortOrder),
            featured = record.get(sFeatured),
            translations = translations,
            variants = variants,
        )

    private fun mapVariant(record: Record): ServiceVariant =
        ServiceVariant(
            id = record.get(vId),
            durationMinutes = record.get(vDuration),
            price = Money(
                amountCents = record.get(vPriceCents),
                currency = record.get(vCurrency),
            ),
            active = record.get(vActive),
            sortOrder = record.get(vSortOrder),
        )

    private data class OwnedVariant(
        val serviceId: UUID,
        val variant: ServiceVariant,
    )

    private data class TranslationKey(
        val serviceId: UUID,
        val locale: String,
    )
}
