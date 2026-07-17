package com.byiara.api.finance.domain

import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class FinanceTotals(
    val revenueCents: Long,
    val expenseCents: Long,
    val outstandingBalanceCents: Long,
    val completedAppointments: Int,
    val noShows: Int,
    val averageCompletedValueCents: Long,
    val revenueByPaymentMethod: List<PaymentMethodTotal>,
)

data class DailyFinancialTotals(
    val day: LocalDate,
    val revenueCents: Long,
    val expenseCents: Long,
)

interface FinanceRepository {
    fun createExpense(expense: NewExpense): Expense

    fun findExpenseById(id: UUID): Expense?

    fun listExpenses(from: OffsetDateTime, to: OffsetDateTime, limit: Int, offset: Int): List<Expense>

    fun countExpenses(from: OffsetDateTime, to: OffsetDateTime): Int

    fun listIncomePayments(
        from: OffsetDateTime,
        to: OffsetDateTime,
        currency: String,
        limit: Int,
        offset: Int,
    ): List<IncomePayment>

    fun countIncomePayments(from: OffsetDateTime, to: OffsetDateTime, currency: String): Int

    fun voidExpense(id: UUID, voidedAt: OffsetDateTime): Boolean

    fun totals(from: OffsetDateTime, to: OffsetDateTime, currency: String): FinanceTotals

    fun dailyTotals(from: OffsetDateTime, to: OffsetDateTime, currency: String): List<DailyFinancialTotals>
}
