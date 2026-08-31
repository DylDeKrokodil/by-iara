import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ActionMenu,
  ActionMenuItem,
  Alert,
  Button,
  Card,
  ConfirmationModal,
  DataTable,
  DataTableColumn,
  EmptyState,
  PageHeader,
  SelectField,
  SelectFieldOption,
  StatusChip,
  TabOption,
  Tabs,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';
import { forkJoin } from 'rxjs';
import { formatMoney } from '../../services/service.models';
import { FinanceApi } from '../finance-api';
import {
  Expense,
  ExpenseCategory,
  FinancialReport,
  IncomePayment,
  expenseCategoryLabels,
} from '../finance.models';

const businessTimeZone = 'Europe/Brussels';
const currency = 'EUR';
const expensePageSize = 20;
const paymentPageSize = 20;

type PeriodPreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM';

const categoryOptions: ReadonlyArray<SelectFieldOption> = Object.entries(expenseCategoryLabels).map(
  ([value, label]) => ({ value, label }),
);

const expenseColumns: ReadonlyArray<DataTableColumn> = [
  { key: 'date', label: 'Date', width: '8.5rem' },
  { key: 'expense', label: 'Expense' },
  { key: 'category', label: 'Category', width: '13rem' },
  { key: 'amount', label: 'Amount', width: '8rem' },
  { key: 'status', label: 'Status', fit: true },
  { key: 'actions', label: 'Actions', fit: true },
];

const expenseActions: ReadonlyArray<ActionMenuItem> = [
  { id: 'edit', label: 'Edit expense', icon: 'edit' },
  { id: 'void', label: 'Void expense', icon: 'void', tone: 'danger' },
];

const paymentColumns: ReadonlyArray<DataTableColumn> = [
  { key: 'date', label: 'Received', width: '9rem' },
  { key: 'customer', label: 'Customer' },
  { key: 'service', label: 'Service' },
  { key: 'method', label: 'Method', width: '10rem' },
  { key: 'amount', label: 'Amount', width: '9rem' },
];

const reportTabs: ReadonlyArray<TabOption> = [
  { label: 'Income', value: 'income' },
  { label: 'Profit & expenses', value: 'profit' },
];

@Component({
  selector: 'byiara-reports',
  imports: [
    ReactiveFormsModule,
    ActionMenu,
    Alert,
    Button,
    Card,
    ConfirmationModal,
    DataTable,
    EmptyState,
    PageHeader,
    SelectField,
    StatusChip,
    Tabs,
    TextField,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  private readonly api = inject(FinanceApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  @ViewChild('voidExpenseModal') private voidExpenseModal!: ConfirmationModal;

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly report = signal<FinancialReport | null>(null);
  protected readonly comparisonReport = signal<FinancialReport | null>(null);
  protected readonly payments = signal<IncomePayment[]>([]);
  protected readonly paymentTotal = signal(0);
  protected readonly paymentPage = signal(0);
  protected readonly expenses = signal<Expense[]>([]);
  protected readonly expenseTotal = signal(0);
  protected readonly expensePage = signal(0);
  protected readonly expenseFormOpen = signal(false);
  protected readonly editingExpense = signal<Expense | null>(null);
  protected readonly expenseToVoid = signal<Expense | null>(null);
  protected readonly activePreset = signal<PeriodPreset>('THIS_MONTH');
  protected readonly activeTab = signal<'income' | 'profit'>('income');
  protected readonly selectedCategory = signal<ExpenseCategory>('SUPPLIES');
  protected readonly categoryOptions = categoryOptions;
  protected readonly expenseColumns = expenseColumns;
  protected readonly expenseActions = expenseActions;
  protected readonly paymentColumns = paymentColumns;
  protected readonly reportTabs = reportTabs;
  protected readonly Math = Math;

  protected readonly periodForm = this.fb.nonNullable.group({
    from: ['', Validators.required],
    to: ['', Validators.required],
  });

  protected readonly expenseForm = this.fb.nonNullable.group({
    date: [this.todayKey(), Validators.required],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]],
    vendor: ['', Validators.maxLength(160)],
    description: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected readonly totalExpensePages = computed(() =>
    Math.max(1, Math.ceil(this.expenseTotal() / expensePageSize)),
  );

  protected readonly totalPaymentPages = computed(() =>
    Math.max(1, Math.ceil(this.paymentTotal() / paymentPageSize)),
  );

  protected readonly incomeChangeCents = computed(() =>
    (this.report()?.revenueCents ?? 0) - (this.comparisonReport()?.revenueCents ?? 0),
  );

  protected readonly incomeChangePercent = computed(() => {
    const previous = this.comparisonReport()?.revenueCents ?? 0;
    return previous > 0 ? Math.round((this.incomeChangeCents() / previous) * 100) : null;
  });

  ngOnInit(): void {
    this.setPreset('THIS_MONTH');
  }

  protected setPreset(preset: Exclude<PeriodPreset, 'CUSTOM'>): void {
    const today = this.todayKey();
    const [year, month] = today.split('-').map(Number);
    let from: string;
    let to: string;

    if (preset === 'THIS_MONTH') {
      from = `${year}-${String(month).padStart(2, '0')}-01`;
      to = today;
    } else if (preset === 'LAST_MONTH') {
      const firstThisMonth = new Date(Date.UTC(year, month - 1, 1));
      const lastLastMonth = new Date(firstThisMonth.getTime() - 86_400_000);
      from = `${lastLastMonth.getUTCFullYear()}-${String(lastLastMonth.getUTCMonth() + 1).padStart(2, '0')}-01`;
      to = lastLastMonth.toISOString().slice(0, 10);
    } else {
      from = `${year}-01-01`;
      to = today;
    }

    this.activePreset.set(preset);
    this.periodForm.setValue({ from, to });
    this.expensePage.set(0);
    this.paymentPage.set(0);
    this.loadReport();
  }

  protected applyCustomPeriod(): void {
    const period = this.periodForm.getRawValue();
    if (this.periodForm.invalid || period.from > period.to) {
      this.periodForm.markAllAsTouched();
      this.error.set('Choose a valid reporting period.');
      return;
    }
    this.activePreset.set('CUSTOM');
    this.expensePage.set(0);
    this.paymentPage.set(0);
    this.loadReport();
  }

  protected setActiveTab(value: string): void {
    if (value !== 'income' && value !== 'profit') return;
    this.activeTab.set(value);
    if (value === 'profit' && this.expenses().length === 0) this.loadExpenses();
  }

  protected openExpenseForm(): void {
    this.editingExpense.set(null);
    this.expenseFormOpen.set(true);
    this.expenseForm.reset({ date: this.todayKey(), amount: '', vendor: '', description: '' });
    this.selectedCategory.set('SUPPLIES');
  }

  protected closeExpenseForm(): void {
    this.expenseFormOpen.set(false);
    this.editingExpense.set(null);
  }

  protected editExpense(expense: Expense): void {
    if (expense.status !== 'ACTIVE') return;
    this.editingExpense.set(expense);
    this.selectedCategory.set(expense.category);
    this.expenseForm.setValue({
      date: this.dateKey(expense.incurredAt),
      amount: (expense.amountCents / 100).toFixed(2),
      vendor: expense.vendor ?? '',
      description: expense.description,
    });
    this.expenseFormOpen.set(true);
  }

  protected handleExpenseAction(expense: Expense, action: string): void {
    if (action === 'edit') this.editExpense(expense);
    if (action === 'void') this.requestVoid(expense);
  }

  protected setExpenseCategory(value: string): void {
    if (value in expenseCategoryLabels) this.selectedCategory.set(value as ExpenseCategory);
  }

  protected submitExpense(): void {
    if (this.expenseForm.invalid || this.submitting()) {
      this.expenseForm.markAllAsTouched();
      return;
    }
    const form = this.expenseForm.getRawValue();
    this.submitting.set(true);
    const input = {
      category: this.selectedCategory(),
      amountCents: Math.round(Number(form.amount.replace(',', '.')) * 100),
      currency,
      incurredAt: this.zonedDateTimeIso(form.date, 12),
      vendor: form.vendor.trim() || undefined,
      description: form.description.trim(),
    };
    const editing = this.editingExpense();
    const request = editing ? this.api.updateExpense(editing.id, input) : this.api.createExpense(input);
    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.expenseFormOpen.set(false);
        this.editingExpense.set(null);
        this.expensePage.set(0);
        this.loadReport();
        this.toast.show(editing ? 'Expense updated.' : 'Expense recorded.', 'success');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.toast.show(this.apiError(error, editing ? 'Could not update the expense.' : 'Could not record the expense.'), 'error');
      },
    });
  }

  protected requestVoid(expense: Expense): void {
    this.expenseToVoid.set(expense);
    this.voidExpenseModal.open();
  }

  protected confirmVoid(): void {
    const expense = this.expenseToVoid();
    if (!expense || this.submitting()) return;
    this.submitting.set(true);
    this.api.voidExpense(expense.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.expenseToVoid.set(null);
        this.loadReport();
        this.toast.show('Expense voided. The audit record was retained.', 'success');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.toast.show(this.apiError(error, 'Could not void the expense.'), 'error');
      },
    });
  }

  protected previousExpensePage(): void {
    if (this.expensePage() === 0) return;
    this.expensePage.update((page) => page - 1);
    this.loadExpenses();
  }

  protected nextExpensePage(): void {
    if (this.expensePage() + 1 >= this.totalExpensePages()) return;
    this.expensePage.update((page) => page + 1);
    this.loadExpenses();
  }

  protected previousPaymentPage(): void {
    if (this.paymentPage() === 0) return;
    this.paymentPage.update((page) => page - 1);
    this.loadPayments();
  }

  protected nextPaymentPage(): void {
    if (this.paymentPage() + 1 >= this.totalPaymentPages()) return;
    this.paymentPage.update((page) => page + 1);
    this.loadPayments();
  }

  protected formatAmount(amountCents: number, reportCurrency = currency): string {
    return formatMoney({ amountCents, currency: reportCurrency });
  }

  protected expenseCategoryLabel(category: ExpenseCategory): string {
    return expenseCategoryLabels[category];
  }

  protected paymentMethodLabel(method: string): string {
    return ({ CARD: 'Card', CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', OTHER: 'Other' } as Record<string, string>)[method] ?? method;
  }

  protected incomeHeading(): string {
    return ({
      THIS_MONTH: 'Income received this month',
      LAST_MONTH: 'Income received last month',
      THIS_YEAR: 'Income received this year',
      CUSTOM: 'Income received in this period',
    } as Record<PeriodPreset, string>)[this.activePreset()];
  }

  protected comparisonLabel(): string {
    return this.activePreset() === 'THIS_MONTH' ? 'Compared with the same period last month' : 'Compared with the previous period';
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: businessTimeZone,
    }).format(new Date(value));
  }

  protected trendLabel(value: string, granularity: FinancialReport['granularity']): string {
    const date = new Date(`${value}T12:00:00Z`);
    return new Intl.DateTimeFormat('en-GB', granularity === 'MONTHLY'
      ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
  }

  private loadReport(): void {
    const range = this.apiRange();
    if (!range) return;
    const comparison = this.comparisonRange();
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      report: this.api.report(range.from, range.to, currency),
      comparison: this.api.report(comparison.from, comparison.to, currency),
      payments: this.api.payments(range.from, range.to, currency, this.paymentPage(), paymentPageSize),
    }).subscribe({
      next: ({ report, comparison, payments }) => {
        this.report.set(report);
        this.comparisonReport.set(comparison);
        this.payments.set(payments.items);
        this.paymentTotal.set(payments.total);
        this.loading.set(false);
        if (this.activeTab() === 'profit') this.loadExpenses();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load the financial report.');
      },
    });
  }

  private loadExpenses(): void {
    const range = this.apiRange();
    if (!range) return;
    this.api.expenses(range.from, range.to, this.expensePage(), expensePageSize).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses.items);
        this.expenseTotal.set(expenses.total);
      },
      error: () => this.error.set('Could not load expenses.'),
    });
  }

  private loadPayments(): void {
    const range = this.apiRange();
    if (!range) return;
    this.api.payments(range.from, range.to, currency, this.paymentPage(), paymentPageSize).subscribe({
      next: (payments) => {
        this.payments.set(payments.items);
        this.paymentTotal.set(payments.total);
      },
      error: () => this.error.set('Could not load payments.'),
    });
  }

  private comparisonRange(): { from: string; to: string } {
    const { from, to } = this.periodForm.getRawValue();
    const start = new Date(`${from}T12:00:00Z`);
    const endExclusive = new Date(`${this.addDays(to, 1)}T12:00:00Z`);
    let previousFrom: Date;
    let previousTo: Date;
    if (this.activePreset() === 'THIS_MONTH' || this.activePreset() === 'LAST_MONTH') {
      previousFrom = new Date(start.getTime());
      previousFrom.setUTCMonth(previousFrom.getUTCMonth() - 1);
      previousTo = new Date(endExclusive.getTime());
      previousTo.setUTCMonth(previousTo.getUTCMonth() - 1);
    } else if (this.activePreset() === 'THIS_YEAR') {
      previousFrom = new Date(start.getTime());
      previousFrom.setUTCFullYear(previousFrom.getUTCFullYear() - 1);
      previousTo = new Date(endExclusive.getTime());
      previousTo.setUTCFullYear(previousTo.getUTCFullYear() - 1);
    } else {
      const duration = endExclusive.getTime() - start.getTime();
      previousTo = new Date(start.getTime());
      previousFrom = new Date(previousTo.getTime() - duration);
    }
    return {
      from: this.zonedDateTimeIso(previousFrom.toISOString().slice(0, 10)),
      to: this.zonedDateTimeIso(previousTo.toISOString().slice(0, 10)),
    };
  }

  private apiRange(): { from: string; to: string } | null {
    const { from, to } = this.periodForm.getRawValue();
    if (!from || !to) return null;
    return {
      from: this.zonedDateTimeIso(from),
      to: this.zonedDateTimeIso(this.addDays(to, 1)),
    };
  }

  private todayKey(): string {
    return this.dateKey(new Date());
  }

  private dateKey(input: string | Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: businessTimeZone,
    }).formatToParts(new Date(input));
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  private addDays(key: string, days: number): string {
    const date = new Date(`${key}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private zonedDateTimeIso(key: string, hour = 0): string {
    const [year, month, day] = key.split('-').map(Number);
    const wanted = Date.UTC(year, month - 1, day, hour, 0, 0);
    let utcTime = wanted;
    for (let index = 0; index < 3; index += 1) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        second: '2-digit', hourCycle: 'h23', timeZone: businessTimeZone,
      }).formatToParts(new Date(utcTime));
      const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
      const actual = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
      utcTime += wanted - actual;
    }
    return new Date(utcTime).toISOString();
  }

  private apiError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
