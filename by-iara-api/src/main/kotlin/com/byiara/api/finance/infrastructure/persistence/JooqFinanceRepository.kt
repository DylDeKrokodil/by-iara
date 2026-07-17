package com.byiara.api.finance.infrastructure.persistence

import com.byiara.api.finance.domain.DailyFinancialTotals
import com.byiara.api.finance.domain.Expense
import com.byiara.api.finance.domain.ExpenseCategory
import com.byiara.api.finance.domain.ExpenseStatus
import com.byiara.api.finance.domain.FinanceRepository
import com.byiara.api.finance.domain.FinanceTotals
import com.byiara.api.finance.domain.IncomePayment
import com.byiara.api.finance.domain.NewExpense
import com.byiara.api.finance.domain.PaymentMethodTotal
import com.byiara.api.reservation.domain.PaymentMethod
import org.jooq.DSLContext
import org.jooq.Field
import org.jooq.impl.DSL.coalesce
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.avg
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.inline
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.sum
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqFinanceRepository(
    private val dsl: DSLContext,
) : FinanceRepository {
    private val expenses = table(name("expenses"))
    private val eId = field(name("expenses", "id"), UUID::class.java)
    private val eCategory = field(name("expenses", "category"), String::class.java)
    private val eAmountCents = field(name("expenses", "amount_cents"), Long::class.java)
    private val eCurrency = field(name("expenses", "currency"), String::class.java)
    private val eIncurredAt = field(name("expenses", "incurred_at"), OffsetDateTime::class.java)
    private val eVendor = field(name("expenses", "vendor"), String::class.java)
    private val eDescription = field(name("expenses", "description"), String::class.java)
    private val eStatus = field(name("expenses", "status"), String::class.java)
    private val eVoidedAt = field(name("expenses", "voided_at"), OffsetDateTime::class.java)
    private val eCreatedAt = field(name("expenses", "created_at"), OffsetDateTime::class.java)
    private val eUpdatedAt = field(name("expenses", "updated_at"), OffsetDateTime::class.java)

    private val payments = table(name("reservation_payments"))
    private val pId = field(name("reservation_payments", "id"), UUID::class.java)
    private val pReservationId = field(name("reservation_payments", "reservation_id"), UUID::class.java)
    private val pAmountCents = field(name("reservation_payments", "amount_cents"), Long::class.java)
    private val pCurrency = field(name("reservation_payments", "currency"), String::class.java)
    private val pMethod = field(name("reservation_payments", "method"), String::class.java)
    private val pStatus = field(name("reservation_payments", "status"), String::class.java)
    private val pPaidAt = field(name("reservation_payments", "paid_at"), OffsetDateTime::class.java)

    private val reservations = table(name("reservations"))
    private val rId = field(name("reservations", "id"), UUID::class.java)
    private val rCustomerId = field(name("reservations", "customer_id"), UUID::class.java)
    private val rServiceName = field(name("reservations", "service_name"), String::class.java)
    private val rPriceCents = field(name("reservations", "price_cents"), Long::class.java)
    private val rCurrency = field(name("reservations", "currency"), String::class.java)
    private val rStartsAt = field(name("reservations", "starts_at"), OffsetDateTime::class.java)
    private val rEndsAt = field(name("reservations", "ends_at"), OffsetDateTime::class.java)
    private val rStatus = field(name("reservations", "status"), String::class.java)

    private val customers = table(name("customers"))
    private val cId = field(name("customers", "id"), UUID::class.java)
    private val cName = field(name("customers", "name"), String::class.java)

    override fun createExpense(expense: NewExpense): Expense {
        val id = dsl.insertInto(expenses)
            .columns(eCategory, eAmountCents, eCurrency, eIncurredAt, eVendor, eDescription)
            .values(
                expense.category.name,
                expense.amountCents,
                expense.currency,
                expense.incurredAt,
                expense.vendor,
                expense.description,
            )
            .returning(eId)
            .fetchOne()!!
            .get(eId)
        return findExpenseById(id)!!
    }

    override fun findExpenseById(id: UUID): Expense? =
        expenseSelect()
            .where(eId.eq(id))
            .fetchOne { mapExpense(it) }

    override fun listExpenses(
        from: OffsetDateTime,
        to: OffsetDateTime,
        limit: Int,
        offset: Int,
    ): List<Expense> =
        expenseSelect()
            .where(eIncurredAt.greaterOrEqual(from).and(eIncurredAt.lessThan(to)))
            .orderBy(eIncurredAt.desc(), eCreatedAt.desc(), eId.asc())
            .limit(limit)
            .offset(offset)
            .fetch { mapExpense(it) }

    override fun countExpenses(from: OffsetDateTime, to: OffsetDateTime): Int =
        dsl.fetchCount(
            dsl.selectFrom(expenses)
                .where(eIncurredAt.greaterOrEqual(from).and(eIncurredAt.lessThan(to))),
        )

    override fun listIncomePayments(
        from: OffsetDateTime,
        to: OffsetDateTime,
        currency: String,
        limit: Int,
        offset: Int,
    ): List<IncomePayment> = dsl
        .select(pId, pReservationId, cName, rServiceName, pAmountCents, pCurrency, pMethod, pPaidAt)
        .from(payments)
        .join(reservations).on(pReservationId.eq(rId))
        .join(customers).on(rCustomerId.eq(cId))
        .where(
            pStatus.eq("PAID")
                .and(pCurrency.eq(currency))
                .and(pPaidAt.greaterOrEqual(from))
                .and(pPaidAt.lessThan(to)),
        )
        .orderBy(pPaidAt.desc(), pId.asc())
        .limit(limit)
        .offset(offset)
        .fetch {
            IncomePayment(
                id = it.get(pId),
                reservationId = it.get(pReservationId),
                customerName = it.get(cName),
                serviceName = it.get(rServiceName),
                amountCents = it.get(pAmountCents),
                currency = it.get(pCurrency),
                method = PaymentMethod.valueOf(it.get(pMethod)),
                paidAt = it.get(pPaidAt),
            )
        }

    override fun countIncomePayments(from: OffsetDateTime, to: OffsetDateTime, currency: String): Int =
        dsl.fetchCount(
            dsl.selectFrom(payments).where(
                pStatus.eq("PAID")
                    .and(pCurrency.eq(currency))
                    .and(pPaidAt.greaterOrEqual(from))
                    .and(pPaidAt.lessThan(to)),
            ),
        )

    override fun voidExpense(id: UUID, voidedAt: OffsetDateTime): Boolean =
        dsl.update(expenses)
            .set(eStatus, ExpenseStatus.VOIDED.name)
            .set(eVoidedAt, voidedAt)
            .set(eUpdatedAt, currentOffsetDateTime())
            .where(eId.eq(id).and(eStatus.eq(ExpenseStatus.ACTIVE.name)))
            .execute() == 1

    override fun totals(from: OffsetDateTime, to: OffsetDateTime, currency: String): FinanceTotals {
        val revenue = sumLong(
            pAmountCents,
            payments,
            pStatus.eq("PAID")
                .and(pCurrency.eq(currency))
                .and(pPaidAt.greaterOrEqual(from))
                .and(pPaidAt.lessThan(to)),
        )
        val expenseTotal = sumLong(
            eAmountCents,
            expenses,
            eStatus.eq(ExpenseStatus.ACTIVE.name)
                .and(eCurrency.eq(currency))
                .and(eIncurredAt.greaterOrEqual(from))
                .and(eIncurredAt.lessThan(to)),
        )
        val completedCondition = rStatus.eq("COMPLETED")
            .and(rCurrency.eq(currency))
            .and(rEndsAt.greaterOrEqual(from))
            .and(rEndsAt.lessThan(to))
        val completedAppointments = dsl.fetchCount(dsl.selectFrom(reservations).where(completedCondition))
        val noShows = dsl.fetchCount(
            dsl.selectFrom(reservations).where(
                rStatus.eq("NO_SHOW")
                    .and(rCurrency.eq(currency))
                    .and(rStartsAt.greaterOrEqual(from))
                    .and(rStartsAt.lessThan(to)),
            ),
        )
        val averageCompletedValue = dsl
            .select(coalesce(avg(rPriceCents), inline(BigDecimal.ZERO)).cast(Long::class.java))
            .from(reservations)
            .where(completedCondition)
            .fetchOne(0, Long::class.java) ?: 0L
        val outstanding = dsl.fetchOne(
            """
            select coalesce(sum(greatest(r.price_cents - coalesce(p.total_paid, 0), 0)), 0)
            from reservations r
            left join (
                select reservation_id, sum(amount_cents) as total_paid
                from reservation_payments
                where status = 'PAID'
                group by reservation_id
            ) p on p.reservation_id = r.id
            where r.status = 'COMPLETED'
              and r.currency = ?
              and r.ends_at >= cast(? as timestamp with time zone)
              and r.ends_at < cast(? as timestamp with time zone)
            """.trimIndent(),
            currency,
            from,
            to,
        )?.get(0, Long::class.java) ?: 0L
        val methods = dsl.select(pMethod, sum(pAmountCents).cast(Long::class.java))
            .from(payments)
            .where(
                pStatus.eq("PAID")
                    .and(pCurrency.eq(currency))
                    .and(pPaidAt.greaterOrEqual(from))
                    .and(pPaidAt.lessThan(to)),
            )
            .groupBy(pMethod)
            .orderBy(sum(pAmountCents).desc())
            .fetch {
                PaymentMethodTotal(
                    method = PaymentMethod.valueOf(it.get(pMethod)),
                    amountCents = it.get(1, Long::class.java),
                )
            }

        return FinanceTotals(
            revenueCents = revenue,
            expenseCents = expenseTotal,
            outstandingBalanceCents = outstanding,
            completedAppointments = completedAppointments,
            noShows = noShows,
            averageCompletedValueCents = averageCompletedValue,
            revenueByPaymentMethod = methods,
        )
    }

    override fun dailyTotals(
        from: OffsetDateTime,
        to: OffsetDateTime,
        currency: String,
    ): List<DailyFinancialTotals> {
        val paymentDay = businessDate(pPaidAt)
        val expenseDay = businessDate(eIncurredAt)
        val revenueSum = sum(pAmountCents).cast(Long::class.java).`as`("revenue_cents")
        val expenseSum = sum(eAmountCents).cast(Long::class.java).`as`("expense_cents")
        val revenue = dsl.select(paymentDay, revenueSum)
            .from(payments)
            .where(
                pStatus.eq("PAID")
                    .and(pCurrency.eq(currency))
                    .and(pPaidAt.greaterOrEqual(from))
                    .and(pPaidAt.lessThan(to)),
            )
            .groupBy(paymentDay)
            .fetchMap(paymentDay, revenueSum)
        val expenseTotals = dsl.select(expenseDay, expenseSum)
            .from(expenses)
            .where(
                eStatus.eq(ExpenseStatus.ACTIVE.name)
                    .and(eCurrency.eq(currency))
                    .and(eIncurredAt.greaterOrEqual(from))
                    .and(eIncurredAt.lessThan(to)),
            )
            .groupBy(expenseDay)
            .fetchMap(expenseDay, expenseSum)

        return (revenue.keys + expenseTotals.keys)
            .sorted()
            .map { day ->
                DailyFinancialTotals(
                    day = day,
                    revenueCents = revenue[day] ?: 0L,
                    expenseCents = expenseTotals[day] ?: 0L,
                )
            }
    }

    private fun expenseSelect() = dsl.select(
        eId,
        eCategory,
        eAmountCents,
        eCurrency,
        eIncurredAt,
        eVendor,
        eDescription,
        eStatus,
        eVoidedAt,
        eCreatedAt,
    ).from(expenses)

    private fun mapExpense(record: org.jooq.Record): Expense = Expense(
        id = record.get(eId),
        category = ExpenseCategory.valueOf(record.get(eCategory)),
        amountCents = record.get(eAmountCents),
        currency = record.get(eCurrency),
        incurredAt = record.get(eIncurredAt),
        vendor = record.get(eVendor),
        description = record.get(eDescription),
        status = ExpenseStatus.valueOf(record.get(eStatus)),
        voidedAt = record.get(eVoidedAt),
        createdAt = record.get(eCreatedAt),
    )

    private fun sumLong(
        amount: Field<Long>,
        source: org.jooq.Table<*>,
        condition: org.jooq.Condition,
    ): Long = dsl.select(coalesce(sum(amount), inline(BigDecimal.ZERO)).cast(Long::class.java))
        .from(source)
        .where(condition)
        .fetchOne(0, Long::class.java) ?: 0L

    private fun businessDate(timestamp: Field<OffsetDateTime>): Field<LocalDate> =
        field("cast({0} at time zone 'Europe/Brussels' as date)", LocalDate::class.java, timestamp)
}
