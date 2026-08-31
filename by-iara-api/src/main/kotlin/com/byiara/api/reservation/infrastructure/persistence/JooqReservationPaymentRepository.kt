package com.byiara.api.reservation.infrastructure.persistence

import com.byiara.api.reservation.domain.NewReservationPayment
import com.byiara.api.reservation.domain.PaymentMethod
import com.byiara.api.reservation.domain.PaymentStatus
import com.byiara.api.reservation.domain.ReservationPayment
import com.byiara.api.reservation.domain.ReservationPaymentRepository
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.coalesce
import org.jooq.impl.DSL.inline
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqReservationPaymentRepository(
    private val dsl: DSLContext,
) : ReservationPaymentRepository {
    private val payments = table(name("reservation_payments"))
    private val id = field(name("id"), UUID::class.java)
    private val reservationId = field(name("reservation_id"), UUID::class.java)
    private val amountCents = field(name("amount_cents"), Long::class.java)
    private val currency = field(name("currency"), String::class.java)
    private val method = field(name("method"), String::class.java)
    private val status = field(name("status"), String::class.java)
    private val paidAt = field(name("paid_at"), OffsetDateTime::class.java)
    private val reference = field(name("reference"), String::class.java)

    override fun create(payment: NewReservationPayment): ReservationPayment {
        val record = dsl.insertInto(payments)
            .columns(reservationId, amountCents, currency, method, status, paidAt, reference)
            .values(
                payment.reservationId,
                payment.amountCents,
                payment.currency,
                payment.method.name,
                PaymentStatus.PAID.name,
                payment.paidAt,
                payment.reference,
            )
            .returning(id, reservationId, amountCents, currency, method, status, paidAt, reference)
            .fetchOne()!!

        return mapPayment(record)
    }

    override fun findByReservationId(reservationId: UUID): List<ReservationPayment> =
        dsl.select(id, this.reservationId, amountCents, currency, method, status, paidAt, reference)
            .from(payments)
            .where(this.reservationId.eq(reservationId))
            .orderBy(paidAt.desc(), id.desc())
            .fetch(::mapPayment)

    override fun totalPaidCents(reservationId: UUID): Long =
        dsl.select(coalesce(amountCents.sum(), inline(java.math.BigDecimal.ZERO)).cast(Long::class.java))
            .from(payments)
            .where(this.reservationId.eq(reservationId))
            .and(status.eq(PaymentStatus.PAID.name))
            .fetchOne(0, Long::class.java) ?: 0L

    private fun mapPayment(record: Record): ReservationPayment = ReservationPayment(
        id = record.get(id),
        reservationId = record.get(reservationId),
        amountCents = record.get(amountCents),
        currency = record.get(currency),
        method = PaymentMethod.valueOf(record.get(method)),
        status = PaymentStatus.valueOf(record.get(status)),
        paidAt = record.get(paidAt),
        reference = record.get(reference),
    )
}
