package com.byiara.api.customer.infrastructure.persistence

import com.byiara.api.customer.domain.CustomerQueryRepository
import com.byiara.api.customer.domain.CustomerPackSummary
import com.byiara.api.customer.domain.CustomerSearchResult
import com.byiara.api.pack.domain.CustomerPackStatus
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.impl.DSL.count
import org.jooq.impl.DSL.countDistinct
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.inline
import org.jooq.impl.DSL.max
import org.jooq.impl.DSL.min
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.jooq.impl.DSL.`when`
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqCustomerQueryRepository(
    private val dsl: DSLContext,
) : CustomerQueryRepository {
    private val customers = table(name("customers"))
    private val customerId = field(name("customers", "id"), UUID::class.java)
    private val customerName = field(name("customers", "name"), String::class.java)
    private val customerEmail = field(name("customers", "email"), String::class.java)
    private val customerPhone = field(name("customers", "phone"), String::class.java)
    private val customerAnonymizedAt =
        field(name("customers", "anonymized_at"), OffsetDateTime::class.java)

    private val reservations = table(name("reservations"))
    private val reservationId = field(name("reservations", "id"), UUID::class.java)
    private val reservationCustomerId = field(name("reservations", "customer_id"), UUID::class.java)
    private val reservationStatus = field(name("reservations", "status"), String::class.java)
    private val reservationStartsAt = field(name("reservations", "starts_at"), OffsetDateTime::class.java)

    private val packs = table(name("customer_packs"))
    private val packId = field(name("customer_packs", "id"), UUID::class.java)
    private val packCustomerId =
        field(name("customer_packs", "customer_id"), UUID::class.java)
    private val packStatus = field(name("customer_packs", "status"), String::class.java)
    private val packServiceName =
        field(name("customer_packs", "service_name"), String::class.java)
    private val packDuration =
        field(name("customer_packs", "duration_minutes"), Int::class.java)
    private val packTotalSessions =
        field(name("customer_packs", "total_sessions"), Int::class.java)
    private val packPriceCents =
        field(name("customer_packs", "price_cents"), Long::class.java)
    private val packCurrency =
        field(name("customer_packs", "currency"), String::class.java)
    private val packExpiresAt =
        field(name("customer_packs", "expires_at"), OffsetDateTime::class.java)

    private val redemptions = table(name("pack_redemptions"))
    private val redemptionPackId =
        field(name("pack_redemptions", "customer_pack_id"), UUID::class.java)
    private val redemptionStatus =
        field(name("pack_redemptions", "status"), String::class.java)
    private val usedSessionCount = field(
        dsl.select(count())
            .from(redemptions)
            .where(
                redemptionPackId.eq(packId)
                    .and(redemptionStatus.`in`("RESERVED", "CONSUMED", "FORFEITED")),
            ),
    ).`as`("used_session_count")

    override fun searchByEmailPrefix(
        emailPrefix: String,
        limit: Int,
        offset: Int,
    ): List<CustomerSearchResult> {
        val now = currentOffsetDateTime()
        val reservationCount = countDistinct(reservationId).`as`("reservation_count")
        val completedReservationCount = countDistinct(
            `when`(reservationStatus.eq("COMPLETED"), reservationId),
        ).`as`("completed_reservation_count")
        val activeReservationCount = countDistinct(
            `when`(reservationStatus.`in`("PENDING", "CONFIRMED"), reservationId),
        ).`as`("active_reservation_count")
        val lastCompletedAt = max(
            `when`(reservationStatus.eq("COMPLETED"), reservationStartsAt),
        ).`as`("last_completed_at")
        val nextReservationAt = min(
            `when`(
                reservationStatus.`in`("PENDING", "CONFIRMED")
                    .and(reservationStartsAt.greaterOrEqual(now)),
                reservationStartsAt,
            ),
        ).`as`("next_reservation_at")
        val exactEmailFirst = `when`(customerEmail.equalIgnoreCase(emailPrefix), inline(0))
            .otherwise(1)

        val results = dsl
            .select(
                customerId,
                customerName,
                customerEmail,
                customerPhone,
                reservationCount,
                completedReservationCount,
                activeReservationCount,
                lastCompletedAt,
                nextReservationAt,
            )
            .from(customers)
            .leftJoin(reservations).on(reservationCustomerId.eq(customerId))
            .where(
                customerEmail.startsWithIgnoreCase(emailPrefix)
                    .and(customerAnonymizedAt.isNull),
            )
            .groupBy(customerId, customerName, customerEmail, customerPhone)
            .orderBy(exactEmailFirst.asc(), customerEmail.asc())
            .limit(limit)
            .offset(offset)
            .fetch { record ->
                CustomerSearchResult(
                    id = record.get(customerId),
                    name = record.get(customerName),
                    email = record.get(customerEmail),
                    phone = record.get(customerPhone),
                    reservationCount = record.get(reservationCount),
                    completedReservationCount = record.get(completedReservationCount),
                    activeReservationCount = record.get(activeReservationCount),
                    lastCompletedAt = record.get(lastCompletedAt),
                    nextReservationAt = record.get(nextReservationAt),
                    packs = emptyList(),
                )
            }

        if (results.isEmpty()) {
            return results
        }

        val packsByCustomer = findPacks(packCustomerId.`in`(results.map(CustomerSearchResult::id)))
            .groupBy(PackRecord::customerId)

        return results.map { customer ->
            customer.copy(
                packs = packsByCustomer[customer.id]
                    .orEmpty()
                    .map(PackRecord::summary),
            )
        }
    }

    override fun countByEmailPrefix(emailPrefix: String): Int =
        dsl.fetchCount(
            dsl.selectFrom(customers)
                .where(
                    customerEmail.startsWithIgnoreCase(emailPrefix)
                        .and(customerAnonymizedAt.isNull),
                ),
        )

    private fun findPacks(condition: Condition): List<PackRecord> =
        dsl.select(
            packId,
            packCustomerId,
            packStatus,
            packServiceName,
            packDuration,
            packTotalSessions,
            usedSessionCount,
            packPriceCents,
            packCurrency,
            packExpiresAt,
        )
            .from(packs)
            .where(condition)
            .orderBy(packStatus.asc(), packExpiresAt.asc().nullsLast(), packId.asc())
            .fetch { record ->
                val totalSessions = record.get(packTotalSessions)
                val usedSessions = record.get(usedSessionCount) ?: 0
                PackRecord(
                    customerId = record.get(packCustomerId),
                    summary = CustomerPackSummary(
                        id = record.get(packId),
                        status = CustomerPackStatus.valueOf(record.get(packStatus)),
                        serviceName = record.get(packServiceName),
                        durationMinutes = record.get(packDuration),
                        totalSessions = totalSessions,
                        remainingSessions = (totalSessions - usedSessions).coerceAtLeast(0),
                        priceCents = record.get(packPriceCents),
                        currency = record.get(packCurrency),
                        expiresAt = record.get(packExpiresAt),
                    ),
                )
            }

    private data class PackRecord(
        val customerId: UUID,
        val summary: CustomerPackSummary,
    )
}
