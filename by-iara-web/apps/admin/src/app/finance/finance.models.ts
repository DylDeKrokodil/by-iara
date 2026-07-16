export type ExpenseCategory =
  | 'RENT_UTILITIES'
  | 'SUPPLIES'
  | 'SOFTWARE'
  | 'MARKETING'
  | 'PAYMENT_FEES'
  | 'INSURANCE_LICENSES'
  | 'TRAVEL'
  | 'CONTRACTORS'
  | 'OTHER';

export type ExpenseStatus = 'ACTIVE' | 'VOIDED';
export type TrendGranularity = 'DAILY' | 'MONTHLY';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amountCents: number;
  currency: string;
  incurredAt: string;
  vendor: string | null;
  description: string;
  status: ExpenseStatus;
  voidedAt: string | null;
  createdAt: string;
}

export interface ExpenseInput {
  category: ExpenseCategory;
  amountCents: number;
  currency: string;
  incurredAt: string;
  vendor?: string;
  description: string;
}

export interface ExpensePage {
  items: Expense[];
  page: number;
  size: number;
  total: number;
}

export interface PaymentMethodTotal {
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  amountCents: number;
}

export interface IncomePayment {
  id: string;
  reservationId: string;
  customerName: string;
  serviceName: string;
  amountCents: number;
  currency: string;
  method: PaymentMethodTotal['method'];
  paidAt: string;
}

export interface IncomePaymentPage {
  items: IncomePayment[];
  page: number;
  size: number;
  total: number;
}

export interface FinancialTrendPoint {
  periodStart: string;
  revenueCents: number;
  expenseCents: number;
  profitCents: number;
}

export interface FinancialReport {
  from: string;
  to: string;
  currency: string;
  revenueCents: number;
  expenseCents: number;
  operatingProfitCents: number;
  outstandingBalanceCents: number;
  completedAppointments: number;
  noShows: number;
  averageCompletedValueCents: number;
  granularity: TrendGranularity;
  revenueByPaymentMethod: PaymentMethodTotal[];
  trend: FinancialTrendPoint[];
}

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  RENT_UTILITIES: 'Rent & utilities',
  SUPPLIES: 'Supplies & products',
  SOFTWARE: 'Software & subscriptions',
  MARKETING: 'Marketing',
  PAYMENT_FEES: 'Payment fees',
  INSURANCE_LICENSES: 'Insurance & licences',
  TRAVEL: 'Travel',
  CONTRACTORS: 'Contractors & staff',
  OTHER: 'Other',
};
