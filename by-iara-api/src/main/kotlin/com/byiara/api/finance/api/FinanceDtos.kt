package com.byiara.api.finance.api

import com.byiara.api.finance.application.CreateExpenseCommand
import com.byiara.api.finance.application.ExpensePage
import com.byiara.api.finance.application.IncomePaymentPage
import com.byiara.api.finance.domain.Expense
import com.byiara.api.finance.domain.ExpenseCategory
import com.byiara.api.finance.domain.FinancialReport
import com.byiara.api.finance.domain.IncomePayment
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class CreateExpenseRequest(
    @field:NotNull
    val category: ExpenseCategory?,

    @field:NotNull
    @field:Positive
    val amountCents: Long?,

    @field:NotBlank
    @field:Pattern(regexp = "[A-Za-z]{3}", message = "must be a three-letter currency code")
    val currency: String?,

    @field:NotNull
    val incurredAt: OffsetDateTime?,

    @field:Size(max = 160)
    val vendor: String? = null,

    @field:NotBlank
    @field:Size(max = 500)
    val description: String?,
) {
    fun toCommand(): CreateExpenseCommand = CreateExpenseCommand(
        category = category!!,
        amountCents = amountCents!!,
        currency = currency!!,
        incurredAt = incurredAt!!,
        vendor = vendor,
        description = description!!,
    )
}

data class ExpenseResponse(
    val id: UUID,
    val category: String,
    val amountCents: Long,
    val currency: String,
    val incurredAt: OffsetDateTime,
    val vendor: String?,
    val description: String,
    val status: String,
    val voidedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
)

data class ExpensePageResponse(
    val items: List<ExpenseResponse>,
    val page: Int,
    val size: Int,
    val total: Int,
)

data class PaymentMethodTotalResponse(
    val method: String,
    val amountCents: Long,
)

data class IncomePaymentResponse(
    val id: UUID,
    val reservationId: UUID,
    val customerName: String,
    val serviceName: String,
    val amountCents: Long,
    val currency: String,
    val method: String,
    val paidAt: OffsetDateTime,
)

data class IncomePaymentPageResponse(
    val items: List<IncomePaymentResponse>,
    val page: Int,
    val size: Int,
    val total: Int,
)

data class FinancialTrendPointResponse(
    val periodStart: LocalDate,
    val revenueCents: Long,
    val expenseCents: Long,
    val profitCents: Long,
)

data class FinancialReportResponse(
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
    val granularity: String,
    val revenueByPaymentMethod: List<PaymentMethodTotalResponse>,
    val trend: List<FinancialTrendPointResponse>,
)

fun Expense.toResponse(): ExpenseResponse = ExpenseResponse(
    id = id,
    category = category.name,
    amountCents = amountCents,
    currency = currency,
    incurredAt = incurredAt,
    vendor = vendor,
    description = description,
    status = status.name,
    voidedAt = voidedAt,
    createdAt = createdAt,
)

fun ExpensePage.toResponse(): ExpensePageResponse = ExpensePageResponse(
    items = items.map { it.toResponse() },
    page = page,
    size = size,
    total = total,
)

fun IncomePayment.toResponse(): IncomePaymentResponse = IncomePaymentResponse(
    id = id,
    reservationId = reservationId,
    customerName = customerName,
    serviceName = serviceName,
    amountCents = amountCents,
    currency = currency,
    method = method.name,
    paidAt = paidAt,
)

fun IncomePaymentPage.toResponse(): IncomePaymentPageResponse = IncomePaymentPageResponse(
    items = items.map { it.toResponse() },
    page = page,
    size = size,
    total = total,
)

fun FinancialReport.toResponse(): FinancialReportResponse = FinancialReportResponse(
    from = from,
    to = to,
    currency = currency,
    revenueCents = revenueCents,
    expenseCents = expenseCents,
    operatingProfitCents = operatingProfitCents,
    outstandingBalanceCents = outstandingBalanceCents,
    completedAppointments = completedAppointments,
    noShows = noShows,
    averageCompletedValueCents = averageCompletedValueCents,
    granularity = granularity.name,
    revenueByPaymentMethod = revenueByPaymentMethod.map {
        PaymentMethodTotalResponse(it.method.name, it.amountCents)
    },
    trend = trend.map {
        FinancialTrendPointResponse(it.periodStart, it.revenueCents, it.expenseCents, it.profitCents)
    },
)
