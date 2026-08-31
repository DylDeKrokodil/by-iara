package com.byiara.api.finance.application

import com.byiara.api.finance.domain.Expense
import com.byiara.api.finance.domain.ExpenseCategory
import com.byiara.api.finance.domain.ExpenseNotFoundException
import com.byiara.api.finance.domain.ExpenseStatus
import com.byiara.api.finance.domain.FinanceRepository
import com.byiara.api.finance.domain.FinancialReport
import com.byiara.api.finance.domain.FinancialTrendPoint
import com.byiara.api.finance.domain.InvalidFinanceRequestException
import com.byiara.api.finance.domain.IncomePayment
import com.byiara.api.finance.domain.NewExpense
import com.byiara.api.finance.domain.TrendGranularity
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit
import java.util.UUID

data class ExpenseInputCommand(
    val category: ExpenseCategory,
    val amountCents: Long,
    val currency: String,
    val incurredAt: OffsetDateTime,
    val vendor: String?,
    val description: String,
)

data class ExpensePage(
    val items: List<Expense>,
    val page: Int,
    val size: Int,
    val total: Int,
)

data class IncomePaymentPage(
    val items: List<IncomePayment>,
    val page: Int,
    val size: Int,
    val total: Int,
)

@Service
class FinanceService(
    private val repository: FinanceRepository,
) {
    @Transactional(readOnly = true)
    fun report(from: OffsetDateTime, to: OffsetDateTime, currencyInput: String): FinancialReport {
        validateRange(from, to)
        val currency = normalizeCurrency(currencyInput)
        val totals = repository.totals(from, to, currency)
        val daily = repository.dailyTotals(from, to, currency)
        val granularity = if (ChronoUnit.DAYS.between(from, to) > 92) {
            TrendGranularity.MONTHLY
        } else {
            TrendGranularity.DAILY
        }
        val trend = when (granularity) {
            TrendGranularity.DAILY -> daily.map {
                FinancialTrendPoint(it.day, it.revenueCents, it.expenseCents)
            }
            TrendGranularity.MONTHLY -> daily
                .groupBy { it.day.withDayOfMonth(1) }
                .map { (periodStart, entries) ->
                    FinancialTrendPoint(
                        periodStart = periodStart,
                        revenueCents = entries.sumOf { it.revenueCents },
                        expenseCents = entries.sumOf { it.expenseCents },
                    )
                }
                .sortedBy { it.periodStart }
        }

        return FinancialReport(
            from = from,
            to = to,
            currency = currency,
            revenueCents = totals.revenueCents,
            expenseCents = totals.expenseCents,
            operatingProfitCents = totals.revenueCents - totals.expenseCents,
            outstandingBalanceCents = totals.outstandingBalanceCents,
            completedAppointments = totals.completedAppointments,
            noShows = totals.noShows,
            averageCompletedValueCents = totals.averageCompletedValueCents,
            granularity = granularity,
            revenueByPaymentMethod = totals.revenueByPaymentMethod,
            trend = trend,
        )
    }

    @Transactional(readOnly = true)
    fun listExpenses(from: OffsetDateTime, to: OffsetDateTime, page: Int, size: Int): ExpensePage {
        validateRange(from, to)
        if (page < 0) throw InvalidFinanceRequestException("Page must be zero or greater")
        if (size !in 1..100) throw InvalidFinanceRequestException("Page size must be between 1 and 100")
        return ExpensePage(
            items = repository.listExpenses(from, to, size, page * size),
            page = page,
            size = size,
            total = repository.countExpenses(from, to),
        )
    }

    @Transactional(readOnly = true)
    fun listIncomePayments(
        from: OffsetDateTime,
        to: OffsetDateTime,
        currencyInput: String,
        page: Int,
        size: Int,
    ): IncomePaymentPage {
        validateRange(from, to)
        validatePage(page, size)
        val currency = normalizeCurrency(currencyInput)
        return IncomePaymentPage(
            items = repository.listIncomePayments(from, to, currency, size, page * size),
            page = page,
            size = size,
            total = repository.countIncomePayments(from, to, currency),
        )
    }

    @Transactional
    fun createExpense(command: ExpenseInputCommand): Expense =
        repository.createExpense(normalizeExpense(command))

    @Transactional
    fun updateExpense(id: UUID, command: ExpenseInputCommand): Expense {
        val existing = repository.findExpenseById(id) ?: throw ExpenseNotFoundException(id)
        if (existing.status == ExpenseStatus.VOIDED) {
            throw InvalidFinanceRequestException("Voided expenses cannot be edited")
        }
        if (!repository.updateExpense(id, normalizeExpense(command))) {
            val current = repository.findExpenseById(id) ?: throw ExpenseNotFoundException(id)
            if (current.status == ExpenseStatus.VOIDED) {
                throw InvalidFinanceRequestException("Voided expenses cannot be edited")
            }
            throw ExpenseNotFoundException(id)
        }
        return repository.findExpenseById(id) ?: throw ExpenseNotFoundException(id)
    }

    private fun normalizeExpense(command: ExpenseInputCommand): NewExpense {
        if (command.amountCents <= 0) throw InvalidFinanceRequestException("Expense amount must be greater than zero")
        if (command.incurredAt.isAfter(OffsetDateTime.now().plusMinutes(5))) {
            throw InvalidFinanceRequestException("Expense date cannot be in the future")
        }
        val description = command.description.trim()
        if (description.isBlank()) throw InvalidFinanceRequestException("Expense description is required")

        return NewExpense(
            category = command.category,
            amountCents = command.amountCents,
            currency = normalizeCurrency(command.currency),
            incurredAt = command.incurredAt,
            vendor = command.vendor?.trim()?.ifBlank { null },
            description = description,
        )
    }

    @Transactional
    fun voidExpense(id: UUID): Expense {
        val expense = repository.findExpenseById(id) ?: throw ExpenseNotFoundException(id)
        if (expense.status == ExpenseStatus.VOIDED) return expense
        if (!repository.voidExpense(id, OffsetDateTime.now())) throw ExpenseNotFoundException(id)
        return repository.findExpenseById(id) ?: throw ExpenseNotFoundException(id)
    }

    private fun validateRange(from: OffsetDateTime, to: OffsetDateTime) {
        if (!from.isBefore(to)) throw InvalidFinanceRequestException("Report start must be before report end")
        if (ChronoUnit.DAYS.between(from, to) > 3660) {
            throw InvalidFinanceRequestException("Report range cannot exceed ten years")
        }
    }

    private fun validatePage(page: Int, size: Int) {
        if (page < 0) throw InvalidFinanceRequestException("Page must be zero or greater")
        if (size !in 1..100) throw InvalidFinanceRequestException("Page size must be between 1 and 100")
    }

    private fun normalizeCurrency(value: String): String {
        val currency = value.trim().uppercase()
        if (!currency.matches(Regex("[A-Z]{3}"))) {
            throw InvalidFinanceRequestException("Currency must be a three-letter code")
        }
        return currency
    }
}
