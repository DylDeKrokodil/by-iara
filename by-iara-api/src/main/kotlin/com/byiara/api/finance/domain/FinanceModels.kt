package com.byiara.api.finance.domain

import com.byiara.api.reservation.domain.PaymentMethod
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

enum class ExpenseCategory {
    RENT_UTILITIES,
    SUPPLIES,
    SOFTWARE,
    MARKETING,
    PAYMENT_FEES,
    INSURANCE_LICENSES,
    TRAVEL,
    CONTRACTORS,
    OTHER,
}

enum class ExpenseStatus {
    ACTIVE,
    VOIDED,
}

data class Expense(
    val id: UUID,
    val category: ExpenseCategory,
    val amountCents: Long,
    val currency: String,
    val incurredAt: OffsetDateTime,
    val vendor: String?,
    val description: String,
    val status: ExpenseStatus,
    val voidedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
)

data class NewExpense(
    val category: ExpenseCategory,
    val amountCents: Long,
    val currency: String,
    val incurredAt: OffsetDateTime,
    val vendor: String?,
    val description: String,
)

enum class TrendGranularity {
    DAILY,
    MONTHLY,
}

data class PaymentMethodTotal(
    val method: PaymentMethod,
    val amountCents: Long,
)

data class IncomePayment(
    val id: UUID,
    val reservationId: UUID,
    val customerName: String,
    val serviceName: String,
    val amountCents: Long,
    val currency: String,
    val method: PaymentMethod,
    val paidAt: OffsetDateTime,
)

data class FinancialTrendPoint(
    val periodStart: LocalDate,
    val revenueCents: Long,
    val expenseCents: Long,
) {
    val profitCents: Long = revenueCents - expenseCents
}

data class FinancialReport(
    val from: OffsetDateTime,
    val to: OffsetDateTime,
    val currency: String,
    val revenueCents: Long,
    val expenseCents: Long,
    val operatingProfitCents: Long,
    val outstandingBalanceCents: Long,
    val completedAppointments: Int,
    val noShows: Int,
    val averageCompletedValueCents: Long,
    val granularity: TrendGranularity,
    val revenueByPaymentMethod: List<PaymentMethodTotal>,
    val trend: List<FinancialTrendPoint>,
)

class ExpenseNotFoundException(id: UUID) : RuntimeException("Expense $id was not found")

class InvalidFinanceRequestException(message: String) : RuntimeException(message)
