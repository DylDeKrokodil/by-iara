package com.byiara.api.catalog.infrastructure.persistence

import com.byiara.api.catalog.domain.Money
import com.byiara.api.catalog.domain.Service
import com.byiara.api.catalog.domain.ServiceCommand
import com.byiara.api.catalog.domain.ServiceRepository
import com.byiara.api.catalog.domain.ServiceVariant
import com.byiara.api.catalog.domain.VariantCommand
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.noCondition
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
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

    override fun findCatalog(): List<Service> = loadServices(activeFilter = true, variantsActiveOnly = true)

    override fun findAll(active: Boolean?): List<Service> = loadServices(activeFilter = active, variantsActiveOnly = false)

    override fun findById(id: UUID): Service? {
        val record = dsl
            .select(sId, sSlug, sName, sDescription, sActive, sSortOrder, sFeatured)
            .from(services)
            .where(sId.eq(id))
            .fetchOne()
            ?: return null

        return mapService(record, loadVariants(listOf(id), activeOnly = false).map { it.variant })
    }

    override fun existsBySlug(slug: String): Boolean =
        dsl.fetchExists(dsl.selectOne().from(services).where(sSlug.equalIgnoreCase(slug)))

    override fun create(slug: String, command: ServiceCommand): Service {
        val newId = dsl
            .insertInto(services)
            .columns(sSlug, sName, sDescription, sActive, sSortOrder, sFeatured)
            .values(slug, command.name, command.description, command.active, command.sortOrder, command.featured)
            .returning(sId)
            .fetchOne()!!
            .get(sId)

        insertVariants(newId, command.variants)

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

    private fun loadServices(activeFilter: Boolean?, variantsActiveOnly: Boolean): List<Service> {
        val records = dsl
            .select(sId, sSlug, sName, sDescription, sActive, sSortOrder, sFeatured)
            .from(services)
            .where(
                when (activeFilter) {
                    true -> sActive.isTrue
                    false -> sActive.isFalse
                    null -> noCondition()
                }
            )
            .orderBy(sSortOrder.asc(), sName.asc())
            .fetch()

        if (records.isEmpty()) {
            return emptyList()
        }

        val variantsByService = loadVariants(records.map { it.get(sId) }, variantsActiveOnly)
            .groupBy { it.serviceId }

        return records.map { record ->
            mapService(record, variantsByService[record.get(sId)].orEmpty().map { it.variant })
        }
    }

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

    private fun mapService(record: Record, variants: List<ServiceVariant>): Service =
        Service(
            id = record.get(sId),
            slug = record.get(sSlug),
            name = record.get(sName),
            description = record.get(sDescription),
            active = record.get(sActive),
            sortOrder = record.get(sSortOrder),
            featured = record.get(sFeatured),
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
}
