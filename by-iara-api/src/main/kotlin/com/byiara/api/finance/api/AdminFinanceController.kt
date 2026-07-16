package com.byiara.api.finance.api

import com.byiara.api.finance.application.FinanceService
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import org.springframework.http.HttpStatus
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.util.UUID

@Validated
@RestController
@RequestMapping("/api/admin/finance")
class AdminFinanceController(
    private val service: FinanceService,
) {
    @GetMapping("/report")
    fun report(
        @RequestParam from: OffsetDateTime,
        @RequestParam to: OffsetDateTime,
        @RequestParam(defaultValue = "EUR")
        @Pattern(regexp = "[A-Za-z]{3}")
        currency: String,
    ): FinancialReportResponse = service.report(from, to, currency).toResponse()

    @GetMapping("/expenses")
    fun expenses(
        @RequestParam from: OffsetDateTime,
        @RequestParam to: OffsetDateTime,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ExpensePageResponse = service.listExpenses(from, to, page, size).toResponse()

    @GetMapping("/payments")
    fun payments(
        @RequestParam from: OffsetDateTime,
        @RequestParam to: OffsetDateTime,
        @RequestParam(defaultValue = "EUR")
        @Pattern(regexp = "[A-Za-z]{3}")
        currency: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): IncomePaymentPageResponse = service.listIncomePayments(from, to, currency, page, size).toResponse()

    @PostMapping("/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    fun createExpense(
        @Valid @RequestBody request: CreateExpenseRequest,
    ): ExpenseResponse = service.createExpense(request.toCommand()).toResponse()

    @PatchMapping("/expenses/{id}/void")
    fun voidExpense(@PathVariable id: UUID): ExpenseResponse = service.voidExpense(id).toResponse()
}
