package com.byiara.api.reservation.infrastructure.persistence

import com.byiara.api.catalog.domain.Money
import com.byiara.api.reservation.domain.Customer
import com.byiara.api.reservation.domain.CustomerDetails
import com.byiara.api.reservation.domain.NewReservation
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationRepository
import com.byiara.api.reservation.domain.ReservationStatus
import com.byiara.api.reservation.domain.ReservationWindow
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
    private val rUpdatedAt = field(name("updated_at"), OffsetDateTime::class.java)

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

    override fun findAll(status: ReservationStatus?, limit: Int, offset: Int): List<Reservation> =
        baseSelect()
            .where(statusCondition(status))
            .orderBy(rStartsAt.desc())
            .limit(limit)
            .offset(offset)
            .fetch { mapReservation(it) }

    override fun countAll(status: ReservationStatus?): Int =
        dsl.fetchCount(dsl.selectFrom(reservations).where(statusCondition(status)))

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
                rDuration, rPriceCents, rCurrency, rStartsAt, rEndsAt, rStatus, rNotes,
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
            )
            .returning(rId)
            .fetchOne()!!
            .get(rId)

        return findById(newId)!!
    }

    override fun updateStatus(id: UUID, status: ReservationStatus): Boolean =
        dsl.update(reservations)
            .set(rStatus, status.name)
            .set(rUpdatedAt, currentOffsetDateTime())
            .where(rId.eq(id))
            .execute() > 0

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
            rDuration, rPriceCents, rCurrency, rStartsAt, rEndsAt, rStatus, rNotes,
            cName, cEmail, cPhone,
        )
            .from(reservations)
            .join(customers).on(rCustomerId.eq(cId))

    private fun statusCondition(status: ReservationStatus?) =
        if (status == null) noCondition() else rStatus.eq(status.name)

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
        )
}
