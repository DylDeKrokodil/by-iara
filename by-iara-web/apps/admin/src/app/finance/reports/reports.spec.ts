import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '@by-iara/shared-ui';
import { of, throwError } from 'rxjs';
import { FinanceApi } from '../finance-api';
import { Expense, ExpensePage, FinancialReport, IncomePaymentPage } from '../finance.models';
import { Reports } from './reports';

const report: FinancialReport = {
  from: '2026-07-01T00:00:00+02:00',
  to: '2026-08-01T00:00:00+02:00',
  currency: 'EUR',
  revenueCents: 18_000,
  expenseCents: 4_000,
  operatingProfitCents: 14_000,
  outstandingBalanceCents: 2_000,
  completedAppointments: 3,
  noShows: 1,
  averageCompletedValueCents: 6_000,
  granularity: 'DAILY',
  revenueByPaymentMethod: [{ method: 'CARD', amountCents: 18_000 }],
  trend: [{ periodStart: '2026-07-10', revenueCents: 18_000, expenseCents: 4_000, profitCents: 14_000 }],
};

const expenses: ExpensePage = {
  items: [{
    id: 'expense-1',
    category: 'SUPPLIES',
    amountCents: 4_000,
    currency: 'EUR',
    incurredAt: '2026-07-10T12:00:00+02:00',
    vendor: 'Wellness Supply',
    description: 'Massage oil',
    status: 'ACTIVE',
    voidedAt: null,
    createdAt: '2026-07-10T12:00:00+02:00',
  }],
  page: 0,
  size: 20,
  total: 1,
};

const payments: IncomePaymentPage = {
  items: [{
    id: 'payment-1',
    reservationId: 'reservation-1',
    customerName: 'Iara Customer',
    serviceName: 'Relaxing massage',
    amountCents: 18_000,
    currency: 'EUR',
    method: 'CARD',
    paidAt: '2026-07-10T12:00:00+02:00',
  }],
  page: 0,
  size: 20,
  total: 1,
};

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;
  let api: {
    report: ReturnType<typeof vi.fn>;
    expenses: ReturnType<typeof vi.fn>;
    payments: ReturnType<typeof vi.fn>;
    createExpense: ReturnType<typeof vi.fn>;
    updateExpense: ReturnType<typeof vi.fn>;
    voidExpense: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      report: vi.fn(() => of(report)),
      expenses: vi.fn(() => of(expenses)),
      payments: vi.fn(() => of(payments)),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      voidExpense: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        { provide: FinanceApi, useValue: api },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
  });

  it('leads with received income and the payments behind it', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(api.report).toHaveBeenCalledTimes(2);
    expect(api.payments).toHaveBeenCalledOnce();
    expect(api.expenses).not.toHaveBeenCalled();
    expect(text).toContain('Income received this month');
    expect(text).toContain('Iara Customer');
    expect(text).toContain('Relaxing massage');
    expect(text).toContain('Card');
  });

  it('shows a recoverable error when reporting data cannot load', () => {
    api.report.mockImplementation(() => throwError(() => new Error('offline')));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load the financial report.');
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });

  it('prefills and updates an active expense', () => {
    const expense = expenses.items[0];
    api.updateExpense.mockReturnValue(of({ ...expense, description: 'Corrected massage oil' }));
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      setActiveTab(value: string): void;
      editExpense(value: Expense): void;
      expenseForm: { patchValue(value: { description: string }): void };
      submitExpense(): void;
    };
    component.setActiveTab('profit');
    component.editExpense(expense);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Edit expense');
    component.expenseForm.patchValue({ description: 'Corrected massage oil' });
    component.submitExpense();

    expect(api.updateExpense).toHaveBeenCalledWith('expense-1', {
      category: 'SUPPLIES', amountCents: 4_000, currency: 'EUR', incurredAt: expect.any(String),
      vendor: 'Wellness Supply', description: 'Corrected massage oil',
    });
  });
});
