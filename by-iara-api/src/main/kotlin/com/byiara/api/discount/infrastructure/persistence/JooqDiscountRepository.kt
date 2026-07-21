package com.byiara.api.discount.infrastructure.persistence

import com.byiara.api.discount.domain.Discount
import com.byiara.api.discount.domain.DiscountAudience
import com.byiara.api.discount.domain.DiscountQuote
import com.byiara.api.discount.domain.DiscountRecipient
import com.byiara.api.discount.domain.DiscountRepository
import com.byiara.api.discount.domain.DiscountScope
import com.byiara.api.discount.domain.DiscountStatus
import com.byiara.api.discount.domain.DiscountUsage
import com.byiara.api.discount.domain.DiscountUsageStatus
import com.byiara.api.discount.domain.DiscountValueType
import com.byiara.api.discount.domain.NewDiscount
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL.count
import org.jooq.impl.DSL.countDistinct
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqDiscountRepository(private val dsl: DSLContext) : DiscountRepository {
    private val discounts = table(name("discounts"))
    private val dId = field(name("discounts", "id"), UUID::class.java)
    private val dName = field(name("discounts", "name"), String::class.java)
    private val dAudience = field(name("discounts", "audience"), String::class.java)
    private val dScope = field(name("discounts", "scope"), String::class.java)
    private val dValueType = field(name("discounts", "value_type"), String::class.java)
    private val dValueAmount = field(name("discounts", "value_amount"), Long::class.java)
    private val dCurrency = field(name("discounts", "currency"), String::class.java)
    private val dStartsAt = field(name("discounts", "starts_at"), OffsetDateTime::class.java)
    private val dEndsAt = field(name("discounts", "ends_at"), OffsetDateTime::class.java)
    private val dMaxClients = field(name("discounts", "max_unique_clients"), Int::class.java)
    private val dMaxPerCustomer = field(name("discounts", "max_uses_per_customer"), Int::class.java)
    private val dCodeHash = field(name("discounts", "code_hash"), String::class.java)
    private val dCodeHint = field(name("discounts", "code_hint"), String::class.java)
    private val dCustomerId = field(name("discounts", "customer_id"), UUID::class.java)
    private val dStatus = field(name("discounts", "status"), String::class.java)
    private val dPublicCode = field(name("discounts", "public_code"), String::class.java)
    private val dFeatured = field(name("discounts", "featured"), Boolean::class.java)
    private val dUpdatedAt = field(name("discounts", "updated_at"), OffsetDateTime::class.java)

    private val scopes = table(name("discount_services"))
    private val sDiscountId = field(name("discount_services", "discount_id"), UUID::class.java)
    private val sServiceId = field(name("discount_services", "service_id"), UUID::class.java)

    private val usages = table(name("reservation_discounts"))
    private val uId = field(name("reservation_discounts", "id"), UUID::class.java)
    private val uReservationId = field(name("reservation_discounts", "reservation_id"), UUID::class.java)
    private val uDiscountId = field(name("reservation_discounts", "discount_id"), UUID::class.java)
    private val uCustomerId = field(name("reservation_discounts", "customer_id"), UUID::class.java)
    private val uCustomerIdentityKey = field(name("reservation_discounts", "customer_identity_key"), String::class.java)
    private val uDiscountName = field(name("reservation_discounts", "discount_name"), String::class.java)
    private val uCodeHint = field(name("reservation_discounts", "code_hint"), String::class.java)
    private val uValueType = field(name("reservation_discounts", "value_type"), String::class.java)
    private val uValueAmount = field(name("reservation_discounts", "value_amount"), Long::class.java)
    private val uOriginal = field(name("reservation_discounts", "original_price_cents"), Long::class.java)
    private val uDiscount = field(name("reservation_discounts", "discount_amount_cents"), Long::class.java)
    private val uFinal = field(name("reservation_discounts", "final_price_cents"), Long::class.java)
    private val uCurrency = field(name("reservation_discounts", "currency"), String::class.java)
    private val uStatus = field(name("reservation_discounts", "status"), String::class.java)
    private val uReservedAt = field(name("reservation_discounts", "reserved_at"), OffsetDateTime::class.java)
    private val uConsumedAt = field(name("reservation_discounts", "consumed_at"), OffsetDateTime::class.java)
    private val uReleasedAt = field(name("reservation_discounts", "released_at"), OffsetDateTime::class.java)
    private val uUpdatedAt = field(name("reservation_discounts", "updated_at"), OffsetDateTime::class.java)

    private val customers = table(name("customers"))
    private val cId = field(name("customers", "id"), UUID::class.java)
    private val cName = field(name("customers", "name"), String::class.java)
    private val cEmail = field(name("customers", "email"), String::class.java)
    private val reservations = table(name("reservations"))
    private val rId = field(name("reservations", "id"), UUID::class.java)
    private val rServiceName = field(name("reservations", "service_name"), String::class.java)
    private val rCustomerId = field(name("reservations", "customer_id"), UUID::class.java)
    private val rStatus = field(name("reservations", "status"), String::class.java)
    private val rLocale = field(name("reservations", "locale"), String::class.java)
    private val rEndsAt = field(name("reservations", "ends_at"), OffsetDateTime::class.java)

    private val activeUsageStatuses = listOf(DiscountUsageStatus.RESERVED.name, DiscountUsageStatus.CONSUMED.name)

    override fun create(discount: NewDiscount): Discount {
        val command = discount.command
        if (discount.featured) dsl.update(discounts).set(dFeatured, false).where(dFeatured.isTrue).execute()
        val id = dsl.insertInto(discounts)
            .columns(
                dName, dAudience, dScope, dValueType, dValueAmount, dCurrency, dStartsAt, dEndsAt,
                dMaxClients, dMaxPerCustomer, dCodeHash, dCodeHint, dCustomerId, dStatus, dPublicCode, dFeatured,
            )
            .values(
                command.name, command.audience.name, command.scope.name, command.valueType.name,
                command.valueAmount, command.currency, command.startsAt, command.endsAt,
                command.maxUniqueClients, command.maxUsesPerCustomer, discount.codeHash,
                discount.codeHint, discount.customerId, DiscountStatus.ACTIVE.name, discount.publicCode, discount.featured,
            )
            .returning(dId).fetchOne()!!.get(dId)
        command.serviceIds.forEach { serviceId ->
            dsl.insertInto(scopes).columns(sDiscountId, sServiceId).values(id, serviceId).execute()
        }
        return requireNotNull(findById(id))
    }

    override fun list(): List<Discount> = selectDiscounts(dId.isNotNull).sortedByDescending { it.startsAt }

    override fun findById(id: UUID): Discount? = selectDiscounts(dId.eq(id)).singleOrNull()

    override fun findByCodeHash(codeHash: String, forUpdate: Boolean): Discount? {
        var query = dsl.select(dId).from(discounts).where(dCodeHash.eq(codeHash))
        val id = if (forUpdate) query.forUpdate().fetchOne(dId) else query.fetchOne(dId)
        return id?.let(::findById)
    }

    override fun findCustomerIdByEmail(email: String): UUID? =
        dsl.select(cId).from(customers).where(cEmail.eq(email)).fetchOne(cId)

    override fun findCompletedRecipientByEmail(email: String): DiscountRecipient? =
        dsl.select(cId, cName, cEmail, rLocale, rId).from(customers)
            .join(reservations).on(rCustomerId.eq(cId))
            .where(cEmail.eq(email).and(rStatus.eq("COMPLETED")))
            .orderBy(rEndsAt.desc())
            .limit(1)
            .fetchOne { record ->
                DiscountRecipient(
                    customerId = record.get(cId)!!,
                    name = record.get(cName)!!,
                    email = record.get(cEmail)!!,
                    locale = record.get(rLocale) ?: "en",
                    reservationId = record.get(rId)!!,
                )
            }

    override fun activeUsageCount(discountId: UUID, customerIdentityKey: String): Int =
        dsl.selectCount().from(usages)
            .where(
                uDiscountId.eq(discountId)
                    .and(uCustomerIdentityKey.eq(customerIdentityKey))
                    .and(uStatus.`in`(activeUsageStatuses)),
            )
            .fetchOne(0, Int::class.java) ?: 0

    override fun activeUniqueClientCount(discountId: UUID): Int =
        dsl.select(countDistinct(uCustomerIdentityKey)).from(usages)
            .where(uDiscountId.eq(discountId).and(uStatus.`in`(activeUsageStatuses)))
            .fetchOne(0, Int::class.java) ?: 0

    override fun reserve(
        reservationId: UUID,
        customerId: UUID,
        customerIdentityKey: String,
        quote: DiscountQuote,
    ) {
        dsl.insertInto(usages).columns(
            uReservationId, uDiscountId, uCustomerId, uCustomerIdentityKey,
            uDiscountName, uCodeHint, uValueType, uValueAmount,
            uOriginal, uDiscount, uFinal, uCurrency, uStatus,
        ).values(
            reservationId, quote.discountId, customerId, customerIdentityKey,
            quote.discountName, quote.codeHint,
            quote.valueType.name, quote.valueAmount, quote.originalPrice.amountCents,
            quote.discountAmount.amountCents, quote.finalPrice.amountCents, quote.finalPrice.currency,
            DiscountUsageStatus.RESERVED.name,
        ).execute()
    }

    override fun transitionReservation(reservationId: UUID, target: DiscountUsageStatus, at: OffsetDateTime) {
        var update = dsl.update(usages).set(uStatus, target.name).set(uUpdatedAt, currentOffsetDateTime())
        if (target == DiscountUsageStatus.CONSUMED) update = update.set(uConsumedAt, at)
        if (target == DiscountUsageStatus.RELEASED) update = update.set(uReleasedAt, at)
        update.where(uReservationId.eq(reservationId).and(uStatus.eq(DiscountUsageStatus.RESERVED.name))).execute()
    }

    override fun updateStatus(id: UUID, status: DiscountStatus): Discount? {
        val changed = dsl.update(discounts).set(dStatus, status.name).set(dUpdatedAt, currentOffsetDateTime())
            .where(dId.eq(id)).execute()
        return if (changed > 0) findById(id) else null
    }

    override fun updateFeatured(id: UUID, featured: Boolean): Discount? {
        if (featured) dsl.update(discounts).set(dFeatured, false).where(dFeatured.isTrue).execute()
        val changed = dsl.update(discounts).set(dFeatured, featured).set(dUpdatedAt, currentOffsetDateTime())
            .where(dId.eq(id)).execute()
        return if (changed > 0) findById(id) else null
    }

    override fun findFeatured(now: OffsetDateTime): Discount? = selectDiscounts(
        dFeatured.isTrue
            .and(dStatus.eq(DiscountStatus.ACTIVE.name))
            .and(dStartsAt.le(now))
            .and(dEndsAt.gt(now))
            .and(dPublicCode.isNotNull),
    ).singleOrNull()

    override fun usage(discountId: UUID): List<DiscountUsage> = dsl.select(
        uId, uReservationId, uDiscountName, uOriginal, uDiscount, uFinal, uCurrency, uStatus,
        uReservedAt, uConsumedAt, uReleasedAt, cName, cEmail, rServiceName,
    ).from(usages)
        .join(customers).on(uCustomerId.eq(cId))
        .join(reservations).on(uReservationId.eq(rId))
        .where(uDiscountId.eq(discountId))
        .orderBy(uReservedAt.desc())
        .fetch { record ->
            DiscountUsage(
                id = record.get(uId), reservationId = record.get(uReservationId),
                customerName = record.get(cName), customerEmail = record.get(cEmail),
                serviceName = record.get(rServiceName), discountName = record.get(uDiscountName),
                originalPriceCents = record.get(uOriginal), discountAmountCents = record.get(uDiscount),
                finalPriceCents = record.get(uFinal), currency = record.get(uCurrency),
                status = DiscountUsageStatus.valueOf(record.get(uStatus)), reservedAt = record.get(uReservedAt),
                consumedAt = record.get(uConsumedAt), releasedAt = record.get(uReleasedAt),
            )
        }

    private fun selectDiscounts(condition: Condition): List<Discount> {
        val records = dsl.select(
            dId, dName, dAudience, dScope, dValueType, dValueAmount, dCurrency, dStartsAt, dEndsAt,
            dMaxClients, dMaxPerCustomer, dCodeHint, dCustomerId, dStatus, dPublicCode, dFeatured, cEmail,
        ).from(discounts).leftJoin(customers).on(dCustomerId.eq(cId)).where(condition).fetch()
        return records.map(::mapDiscount)
    }

    private fun mapDiscount(record: Record): Discount {
        val id = record.get(dId)
        val serviceIds = dsl.select(sServiceId).from(scopes).where(sDiscountId.eq(id)).fetch(sServiceId).toSet()
        val reserved = usageCount(id, DiscountUsageStatus.RESERVED)
        val consumed = usageCount(id, DiscountUsageStatus.CONSUMED)
        return Discount(
            id = id, name = record.get(dName), audience = DiscountAudience.valueOf(record.get(dAudience)),
            scope = DiscountScope.valueOf(record.get(dScope)),
            valueType = DiscountValueType.valueOf(record.get(dValueType)), valueAmount = record.get(dValueAmount),
            currency = record.get(dCurrency), startsAt = record.get(dStartsAt), endsAt = record.get(dEndsAt),
            maxUniqueClients = record.get(dMaxClients), maxUsesPerCustomer = record.get(dMaxPerCustomer),
            codeHint = record.get(dCodeHint), customerId = record.get(dCustomerId), customerEmail = record.get(cEmail),
            status = DiscountStatus.valueOf(record.get(dStatus)), serviceIds = serviceIds,
            reservedUses = reserved, consumedUses = consumed, uniqueClients = activeUniqueClientCount(id),
            publicCode = record.get(dPublicCode), featured = record.get(dFeatured) ?: false,
        )
    }

    private fun usageCount(discountId: UUID, status: DiscountUsageStatus): Int =
        dsl.select(count()).from(usages).where(uDiscountId.eq(discountId).and(uStatus.eq(status.name)))
            .fetchOne(0, Int::class.java) ?: 0
}
