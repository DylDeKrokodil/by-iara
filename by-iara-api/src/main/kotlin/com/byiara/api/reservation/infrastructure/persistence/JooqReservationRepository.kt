package com.byiara.api.reservation.infrastructure.persistence

import com.byiara.api.catalog.domain.Money
import com.byiara.api.reservation.domain.Customer
import com.byiara.api.reservation.domain.CustomerDetails
import com.byiara.api.reservation.domain.CancellationReasonCode
import com.byiara.api.reservation.domain.AttentionReason
import com.byiara.api.reservation.domain.NewReservation
import com.byiara.api.reservation.domain.PaymentState
import com.byiara.api.reservation.domain.PaymentSummary
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationAttention
import com.byiara.api.reservation.domain.ReservationListQuery
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.RejectionReasonCode
import com.byiara.api.reservation.domain.ReservationSort
import com.byiara.api.reservation.domain.ReservationStatus
import com.byiara.api.reservation.domain.ReservationWindow
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Field
import org.jooq.Record
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.coalesce
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.inline
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.noCondition
import org.jooq.impl.DSL.sum
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqReservationRepository(
    private val dsl: DSLContext,
) : ReservationRepository {
    private val reservations = table(name("reservations"))
    // id exists on both tables; qualify it so the customer join is unambiguous.
    private val rId = field(name("reservations", "id"), UUID::class.java)
    private val rCustomerId = field(name("customer_id"), UUID::class.java)
    private val rServiceId = field(name("service_id"), UUID::class.java)
    private val rServiceVariantId = field(name("service_variant_id"), UUID::class.java)
    private val rServiceName = field(name("service_name"), String::class.java)
    private val rDuration = field(name("duration_minutes"), Int::class.java)
    private val rPriceCents = field(name("price_cents"), Long::class.java)
    private val rCurrency = field(name("currency"), String::class.java)
    private val rStartsAt = field(name("starts_at"), OffsetDateTime::class.java)
    private val rEndsAt = field(name("ends_at"), OffsetDateTime::class.java)
    private val rStatus = field(name("status"), String::class.java)
    private val rNotes = field(name("notes"), String::class.java)
    private val rLocale = field(name("locale"), String::class.java)
    private val rRejectionReasonCode = field(name("rejection_reason_code"), String::class.java)
    private val rRejectionMessage = field(name("rejection_message"), String::class.java)
    private val rDecidedAt = field(name("decided_at"), OffsetDateTime::class.java)
    private val rCancellationReasonCode = field(name("cancellation_reason_code"), String::class.java)
    private val rCancellationMessage = field(name("cancellation_message"), String::class.java)
    private val rUpdatedAt = field(name("updated_at"), OffsetDateTime::class.java)

    private val payments = table(name("reservation_payments"))
    private val pReservationId = field(name("reservation_payments", "reservation_id"), UUID::class.java)
    private val pAmountCents = field(name("reservation_payments", "amount_cents"), Long::class.java)
    private val pStatus = field(name("reservation_payments", "status"), String::class.java)
    private val totalPaidExpression: Field<Long> = field(
        dsl.select(coalesce(sum(pAmountCents), inline(java.math.BigDecimal.ZERO)).cast(Long::class.java))
            .from(payments)
            .where(pReservationId.eq(rId))
            .and(pStatus.eq("PAID")),
    )
    private val totalPaid = totalPaidExpression.`as`("total_paid_cents")

    private val customers = table(name("customers"))
    private val cId = field(name("customers", "id"), UUID::class.java)
    private val cName = field(name("name"), String::class.java)
    private val cEmail = field(name("email"), String::class.java)
    private val cPhone = field(name("phone"), String::class.java)

    private val activeStatuses = listOf(ReservationStatus.PENDING.name, ReservationStatus.CONFIRMED.name)

    override fun findById(id: UUID): Reservation? =
        baseSelect()
            .where(rId.eq(id))
            .fetchOne { mapReservation(it) }

    override fun findByIdForUpdate(id: UUID): Reservation? {
        val locked = dsl.select(rId)
            .from(reservations)
            .where(rId.eq(id))
            .forUpdate()
            .fetchOne() ?: return null

        return findById(locked.get(rId))
    }

    override fun findAll(query: ReservationListQuery, limit: Int, offset: Int): List<Reservation> =
        baseSelect()
            .where(listCondition(query))
            .orderBy(
                when (query.sort) {
                    ReservationSort.STARTS_AT_ASC -> rStartsAt.asc()
                    ReservationSort.STARTS_AT_DESC -> rStartsAt.desc()
                },
                rId.asc(),
            )
            .limit(limit)
            .offset(offset)
            .fetch { mapReservation(it) }

    override fun countAll(query: ReservationListQuery): Int =
        dsl.fetchCount(dsl.selectFrom(reservations).where(listCondition(query)))

    override fun hasOverlap(startsAt: OffsetDateTime, endsAt: OffsetDateTime): Boolean =
        dsl.fetchExists(
            dsl.selectOne()
                .from(reservations)
                .where(rStatus.`in`(activeStatuses))
                .and(rStartsAt.lessThan(endsAt))
                .and(rEndsAt.greaterThan(startsAt)),
        )

    override fun findActiveWindowsOverlapping(startsAt: OffsetDateTime, endsAt: OffsetDateTime): List<ReservationWindow> =
        dsl.select(rStartsAt, rEndsAt)
            .from(reservations)
            .where(rStatus.`in`(activeStatuses))
            .and(rStartsAt.lessThan(endsAt))
            .and(rEndsAt.greaterThan(startsAt))
            .fetch { record ->
                ReservationWindow(
                    startsAt = record.get(rStartsAt),
                    endsAt = record.get(rEndsAt),
                )
            }

    override fun create(reservation: NewReservation): Reservation {
        val newId = dsl
            .insertInto(reservations)
            .columns(
                rCustomerId, rServiceId, rServiceVariantId, rServiceName,
                rDuration, rPriceCents, rCurrency, rStartsAt, rEndsAt, rStatus, rNotes, rLocale,
            )
            .values(
                reservation.customerId,
                reservation.serviceId,
                reservation.serviceVariantId,
                reservation.serviceName,
                reservation.durationMinutes,
                reservation.price.amountCents,
                reservation.price.currency,
                reservation.startsAt,
                reservation.endsAt,
                ReservationStatus.PENDING.name,
                reservation.notes,
                reservation.locale.name.lowercase(),
            )
            .returning(rId)
            .fetchOne()!!
            .get(rId)

        return findById(newId)!!
    }

    override fun updateDecision(
        id: UUID,
        status: ReservationStatus,
        rejectionReasonCode: RejectionReasonCode?,
        rejectionMessage: String?,
    ): Boolean =
        dsl.update(reservations)
            .set(rStatus, status.name)
            .set(rRejectionReasonCode, rejectionReasonCode?.name)
            .set(rRejectionMessage, rejectionMessage)
            .set(rDecidedAt, currentOffsetDateTime())
            .set(rUpdatedAt, currentOffsetDateTime())
            .where(rId.eq(id))
            .execute() > 0

    override fun updateCancellation(
        id: UUID,
        cancellationReasonCode: CancellationReasonCode,
        cancellationMessage: String,
    ): Boolean =
        dsl.update(reservations)
            .set(rStatus, ReservationStatus.CANCELLED.name)
            .set(rCancellationReasonCode, cancellationReasonCode.name)
            .set(rCancellationMessage, cancellationMessage)
            .set(rDecidedAt, currentOffsetDateTime())
            .set(rUpdatedAt, currentOffsetDateTime())
            .where(rId.eq(id))
            .execute() > 0

    override fun transitionStatus(id: UUID, from: ReservationStatus, to: ReservationStatus): Boolean =
        dsl.update(reservations)
            .set(rStatus, to.name)
            .set(rDecidedAt, currentOffsetDateTime())
            .set(rUpdatedAt, currentOffsetDateTime())
            .where(rId.eq(id))
            .and(rStatus.eq(from.name))
            .execute() > 0

    override fun findAttention(now: OffsetDateTime, limit: Int, offset: Int): List<ReservationAttention> =
        dsl.select(
            rId, rCustomerId, rServiceId, rServiceVariantId, rServiceName,
            rDuration, rPriceCents, rCurrency, rStartsAt, rEndsAt, rStatus, rNotes, rLocale,
            rRejectionReasonCode, rRejectionMessage, rDecidedAt,
            rCancellationReasonCode, rCancellationMessage,
            cName, cEmail, cPhone, totalPaid,
        )
            .from(reservations)
            .join(customers).on(rCustomerId.eq(cId))
            .where(attentionCondition(now))
            .orderBy(
                field(
                    "case when {0} = {1} then 0 when {0} = {2} then 1 else 2 end",
                    Int::class.java,
                    rStatus,
                    inline(ReservationStatus.CONFIRMED.name),
                    inline(ReservationStatus.PENDING.name),
                ).asc(),
                rStartsAt.asc(),
                rId.asc(),
            )
            .limit(limit)
            .offset(offset)
            .fetch { record ->
                val reservation = mapReservation(record)
                val paid = record.get(totalPaid) ?: 0L
                ReservationAttention(
                    reservation = reservation,
                    reason = when (reservation.status) {
                        ReservationStatus.PENDING -> AttentionReason.APPROVAL_REQUIRED
                        ReservationStatus.CONFIRMED -> AttentionReason.OUTCOME_REQUIRED
                        ReservationStatus.COMPLETED -> AttentionReason.PAYMENT_DUE
                        else -> error("Unexpected attention status ${reservation.status}")
                    },
                    paymentSummary = paymentSummary(reservation, paid),
                )
            }

    override fun countAttention(now: OffsetDateTime): Int =
        dsl.fetchCount(dsl.selectFrom(reservations).where(attentionCondition(now)))

    override fun findOrCreateCustomer(details: CustomerDetails): Customer {
        val email = details.email.trim().lowercase()
        val name = details.name.trim()
        val phone = details.phone?.trim()?.ifBlank { null }

        val existingId = dsl
            .select(cId)
            .from(customers)
            .where(cEmail.eq(email))
            .fetchOne(cId)

        if (existingId != null) {
            // Keep the latest contact details for a returning customer.
            dsl.update(customers)
                .set(cName, name)
                .set(cPhone, phone)
                .where(cId.eq(existingId))
                .execute()
            return Customer(id = existingId, name = name, email = email, phone = phone)
        }

        val newId = dsl
            .insertInto(customers)
            .columns(cName, cEmail, cPhone)
            .values(name, email, phone)
            .returning(cId)
            .fetchOne()!!
            .get(cId)

        return Customer(id = newId, name = name, email = email, phone = phone)
    }

    private fun baseSelect() =
        dsl.select(
            rId, rCustomerId, rServiceId, rServiceVariantId, rServiceName,
            rDuration, rPriceCents, rCurrency, rStartsAt, rEndsAt, rStatus, rNotes, rLocale,
            rRejectionReasonCode, rRejectionMessage, rDecidedAt,
            rCancellationReasonCode, rCancellationMessage,
            cName, cEmail, cPhone,
        )
            .from(reservations)
            .join(customers).on(rCustomerId.eq(cId))

    private fun listCondition(query: ReservationListQuery): Condition {
        var condition = noCondition()

        if (query.statuses.isNotEmpty()) {
            condition = condition.and(rStatus.`in`(query.statuses.map { it.name }))
        }

        if (query.startsFrom != null) {
            condition = condition.and(rStartsAt.greaterOrEqual(query.startsFrom))
        }

        if (query.startsBefore != null) {
            condition = condition.and(rStartsAt.lessThan(query.startsBefore))
        }

        if (query.historyBefore != null) {
            val closedStatuses = listOf(
                ReservationStatus.REJECTED.name,
                ReservationStatus.CANCELLED.name,
                ReservationStatus.COMPLETED.name,
                ReservationStatus.NO_SHOW.name,
            )
            condition = condition.and(
                rStatus.`in`(closedStatuses)
                    .or(rStatus.eq(ReservationStatus.CONFIRMED.name).and(rStartsAt.lessThan(query.historyBefore))),
            )
        }

        return condition
    }

    private fun attentionCondition(now: OffsetDateTime): Condition =
        rStatus.eq(ReservationStatus.PENDING.name)
            .or(rStatus.eq(ReservationStatus.CONFIRMED.name).and(rEndsAt.lessOrEqual(now)))
            .or(rStatus.eq(ReservationStatus.COMPLETED.name).and(totalPaidExpression.lessThan(rPriceCents)))

    private fun paymentSummary(reservation: Reservation, totalPaidCents: Long): PaymentSummary {
        val balance = (reservation.price.amountCents - totalPaidCents).coerceAtLeast(0L)
        val state = when {
            totalPaidCents <= 0L -> PaymentState.UNPAID
            balance > 0L -> PaymentState.PARTIALLY_PAID
            else -> PaymentState.PAID
        }
        return PaymentSummary(totalPaidCents, balance, reservation.price.currency, state)
    }

    private fun mapReservation(record: Record): Reservation =
        Reservation(
            id = record.get(rId),
            customer = Customer(
                id = record.get(rCustomerId),
                name = record.get(cName),
                email = record.get(cEmail),
                phone = record.get(cPhone),
            ),
            serviceId = record.get(rServiceId),
            serviceVariantId = record.get(rServiceVariantId),
            serviceName = record.get(rServiceName),
            durationMinutes = record.get(rDuration),
            price = Money(record.get(rPriceCents), record.get(rCurrency)),
            startsAt = record.get(rStartsAt),
            endsAt = record.get(rEndsAt),
            status = ReservationStatus.valueOf(record.get(rStatus)),
            notes = record.get(rNotes),
            locale = ReservationLocale.fromCode(record.get(rLocale)),
            rejectionReasonCode = record.get(rRejectionReasonCode)?.let(RejectionReasonCode::valueOf),
            rejectionMessage = record.get(rRejectionMessage),
            decidedAt = record.get(rDecidedAt),
            cancellationReasonCode = record.get(rCancellationReasonCode)?.let(CancellationReasonCode::valueOf),
            cancellationMessage = record.get(rCancellationMessage),
        )
}
