package com.byiara.api.pack.infrastructure.persistence

import com.byiara.api.catalog.domain.Money
import com.byiara.api.pack.domain.CustomerPack
import com.byiara.api.pack.domain.CustomerPackStatus
import com.byiara.api.pack.domain.NewCustomerPack
import com.byiara.api.pack.domain.PackRedemptionStatus
import com.byiara.api.pack.domain.PackRepository
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL.count
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.noCondition
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqPackRepository(private val dsl: DSLContext) : PackRepository {
    private val packs = table(name("customer_packs"))
    private val pId = field(name("customer_packs", "id"), UUID::class.java)
    private val pCustomerId = field(name("customer_packs", "customer_id"), UUID::class.java)
    private val pOfferId = field(name("customer_packs", "pack_offer_id"), UUID::class.java)
    private val pOriginId = field(name("customer_packs", "originating_reservation_id"), UUID::class.java)
    private val pStatus = field(name("customer_packs", "status"), String::class.java)
    private val pServiceId = field(name("customer_packs", "service_id"), UUID::class.java)
    private val pServiceName = field(name("customer_packs", "service_name"), String::class.java)
    private val pDuration = field(name("customer_packs", "duration_minutes"), Int::class.java)
    private val pTotal = field(name("customer_packs", "total_sessions"), Int::class.java)
    private val pValidityDays = field(name("customer_packs", "validity_days"), Int::class.java)
    private val pPrice = field(name("customer_packs", "price_cents"), Long::class.java)
    private val pCurrency = field(name("customer_packs", "currency"), String::class.java)
    private val pActivatedAt = field(name("customer_packs", "activated_at"), OffsetDateTime::class.java)
    private val pExpiresAt = field(name("customer_packs", "expires_at"), OffsetDateTime::class.java)
    private val pUpdatedAt = field(name("customer_packs", "updated_at"), OffsetDateTime::class.java)

    private val customers = table(name("customers"))
    private val cId = field(name("customers", "id"), UUID::class.java)
    private val cName = field(name("customers", "name"), String::class.java)
    private val cEmail = field(name("customers", "email"), String::class.java)

    private val redemptions = table(name("pack_redemptions"))
    private val rId = field(name("pack_redemptions", "id"), UUID::class.java)
    private val rPackId = field(name("pack_redemptions", "customer_pack_id"), UUID::class.java)
    private val rReservationId = field(name("pack_redemptions", "reservation_id"), UUID::class.java)
    private val rStatus = field(name("pack_redemptions", "status"), String::class.java)
    private val rConsumedAt = field(name("pack_redemptions", "consumed_at"), OffsetDateTime::class.java)
    private val rReleasedAt = field(name("pack_redemptions", "released_at"), OffsetDateTime::class.java)
    private val rUpdatedAt = field(name("pack_redemptions", "updated_at"), OffsetDateTime::class.java)

    private val usedCount = field(
        dsl.select(count())
            .from(redemptions)
            .where(rPackId.eq(pId).and(rStatus.`in`(USED_STATUSES))),
    ).`as`("used_sessions")

    override fun createPending(pack: NewCustomerPack): CustomerPack {
        val id = dsl.insertInto(packs)
            .columns(
                pCustomerId, pOfferId, pOriginId, pStatus, pServiceId, pServiceName,
                pDuration, pTotal, pValidityDays, pPrice, pCurrency,
            )
            .values(
                pack.customerId, pack.packOfferId, pack.originatingReservationId,
                CustomerPackStatus.PENDING_PAYMENT.name, pack.serviceId, pack.serviceName,
                pack.durationMinutes, pack.totalSessions, pack.validityDays,
                pack.price.amountCents, pack.price.currency,
            )
            .returning(pId)
            .fetchOne()!!
            .get(pId)
        addRedemption(id, pack.originatingReservationId)
        return requireNotNull(findById(id))
    }

    override fun findUsableForUpdate(
        packId: UUID,
        customerId: UUID,
        serviceId: UUID,
        durationMinutes: Int,
    ): CustomerPack? {
        expireElapsed()
        val id = dsl.select(pId)
            .from(packs)
            .where(
                pId.eq(packId)
                    .and(pCustomerId.eq(customerId))
                    .and(pServiceId.eq(serviceId))
                    .and(pDuration.eq(durationMinutes))
                    .and(pStatus.eq(CustomerPackStatus.ACTIVE.name)),
            )
            .forUpdate()
            .fetchOne(pId)
            ?: return null
        return findById(id)?.takeIf { it.remainingSessions > 0 }
    }

    override fun addRedemption(packId: UUID, reservationId: UUID) {
        dsl.insertInto(redemptions)
            .columns(rPackId, rReservationId, rStatus)
            .values(packId, reservationId, PackRedemptionStatus.RESERVED.name)
            .execute()
    }

    override fun listUsable(
        customerId: UUID,
        serviceId: UUID?,
        durationMinutes: Int?,
        now: OffsetDateTime,
    ): List<CustomerPack> {
        expireElapsed(now)
        var condition: Condition = pCustomerId.eq(customerId).and(pStatus.eq(CustomerPackStatus.ACTIVE.name))
        if (serviceId != null) condition = condition.and(pServiceId.eq(serviceId))
        if (durationMinutes != null) condition = condition.and(pDuration.eq(durationMinutes))
        return selectPacks(condition).filter { it.remainingSessions > 0 }
    }

    override fun listAll(): List<CustomerPack> {
        expireElapsed()
        return selectPacks(noCondition())
    }

    override fun activateForOriginatingReservation(reservationId: UUID, now: OffsetDateTime): Boolean {
        val record = dsl.select(pId, pValidityDays)
            .from(packs)
            .where(pOriginId.eq(reservationId).and(pStatus.eq(CustomerPackStatus.PENDING_PAYMENT.name)))
            .forUpdate()
            .fetchOne() ?: return false
        val expiresAt = record.get(pValidityDays)?.let { now.plusDays(it.toLong()) }
        dsl.update(packs)
            .set(pStatus, CustomerPackStatus.ACTIVE.name)
            .set(pActivatedAt, now)
            .set(pExpiresAt, expiresAt)
            .set(pUpdatedAt, currentOffsetDateTime())
            .where(pId.eq(record.get(pId)))
            .execute()
        refreshExhausted(record.get(pId))
        return true
    }

    override fun consumeReservation(reservationId: UUID) = transitionRedemption(
        reservationId,
        PackRedemptionStatus.CONSUMED,
        consumed = true,
    )

    override fun releaseReservation(reservationId: UUID) = transitionRedemption(
        reservationId,
        PackRedemptionStatus.RELEASED,
        released = true,
    )

    override fun forfeitReservation(reservationId: UUID) = transitionRedemption(
        reservationId,
        PackRedemptionStatus.FORFEITED,
    )

    private fun transitionRedemption(
        reservationId: UUID,
        target: PackRedemptionStatus,
        consumed: Boolean = false,
        released: Boolean = false,
    ) {
        val packId = dsl.select(rPackId)
            .from(redemptions)
            .where(rReservationId.eq(reservationId).and(rStatus.eq(PackRedemptionStatus.RESERVED.name)))
            .forUpdate()
            .fetchOne(rPackId) ?: return
        var update = dsl.update(redemptions)
            .set(rStatus, target.name)
            .set(rUpdatedAt, currentOffsetDateTime())
        if (consumed) update = update.set(rConsumedAt, currentOffsetDateTime())
        if (released) update = update.set(rReleasedAt, currentOffsetDateTime())
        update.where(rReservationId.eq(reservationId)).execute()
        if (target == PackRedemptionStatus.RELEASED) {
            dsl.update(packs)
                .set(pStatus, CustomerPackStatus.CANCELLED.name)
                .set(pUpdatedAt, currentOffsetDateTime())
                .where(
                    pId.eq(packId)
                        .and(pOriginId.eq(reservationId))
                        .and(pStatus.eq(CustomerPackStatus.PENDING_PAYMENT.name)),
                )
                .execute()
        }
        if (target != PackRedemptionStatus.RELEASED) refreshExhausted(packId)
    }

    private fun refreshExhausted(packId: UUID) {
        val pack = findById(packId) ?: return
        if (pack.status == CustomerPackStatus.ACTIVE && pack.remainingSessions == 0) {
            dsl.update(packs)
                .set(pStatus, CustomerPackStatus.EXHAUSTED.name)
                .set(pUpdatedAt, currentOffsetDateTime())
                .where(pId.eq(packId))
                .execute()
        }
    }

    private fun expireElapsed(now: OffsetDateTime = OffsetDateTime.now()) {
        dsl.update(packs)
            .set(pStatus, CustomerPackStatus.EXPIRED.name)
            .set(pUpdatedAt, currentOffsetDateTime())
            .where(
                pStatus.eq(CustomerPackStatus.ACTIVE.name)
                    .and(pExpiresAt.isNotNull)
                    .and(pExpiresAt.le(now)),
            )
            .execute()
    }

    private fun findById(id: UUID): CustomerPack? = selectPacks(pId.eq(id)).singleOrNull()

    private fun selectPacks(condition: Condition): List<CustomerPack> = dsl
        .select(
            pId, pCustomerId, pOfferId, pOriginId, pStatus, pServiceId, pServiceName,
            pDuration, pTotal, pValidityDays, pPrice, pCurrency, pActivatedAt, pExpiresAt,
            cName, cEmail, usedCount,
        )
        .from(packs)
        .join(customers).on(pCustomerId.eq(cId))
        .where(condition)
        .orderBy(pStatus.asc(), pExpiresAt.asc().nullsLast(), pId.asc())
        .fetch(::mapPack)

    private fun mapPack(record: Record): CustomerPack {
        val total = record.get(pTotal)
        val used = record.get(usedCount) ?: 0
        return CustomerPack(
            id = record.get(pId),
            customerId = record.get(pCustomerId),
            customerName = record.get(cName),
            customerEmail = record.get(cEmail),
            packOfferId = record.get(pOfferId),
            originatingReservationId = record.get(pOriginId),
            status = CustomerPackStatus.valueOf(record.get(pStatus)),
            serviceId = record.get(pServiceId),
            serviceName = record.get(pServiceName),
            durationMinutes = record.get(pDuration),
            totalSessions = total,
            remainingSessions = (total - used).coerceAtLeast(0),
            price = Money(record.get(pPrice), record.get(pCurrency)),
            validityDays = record.get(pValidityDays),
            activatedAt = record.get(pActivatedAt),
            expiresAt = record.get(pExpiresAt),
        )
    }

    companion object {
        private val USED_STATUSES = listOf(
            PackRedemptionStatus.RESERVED.name,
            PackRedemptionStatus.CONSUMED.name,
            PackRedemptionStatus.FORFEITED.name,
        )
    }
}
