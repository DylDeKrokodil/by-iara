import { Money } from '../services/service.models';
import { StatusChipTone } from '@by-iara/shared-ui';

export const reservationStatuses = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export type ReservationStatus = (typeof reservationStatuses)[number];

export const rejectionReasonCodes = [
  'TIME_UNAVAILABLE',
  'SERVICE_UNAVAILABLE',
  'OUTSIDE_BUSINESS_HOURS',
  'UNABLE_TO_ACCOMMODATE',
  'OTHER',
] as const;

export type RejectionReasonCode = (typeof rejectionReasonCodes)[number];

export const cancellationReasonCodes = [
  'SCHEDULE_CHANGE',
  'PRACTITIONER_UNAVAILABLE',
  'BUSINESS_CLOSURE',
  'CUSTOMER_REQUEST',
  'OTHER',
] as const;

export type CancellationReasonCode = (typeof cancellationReasonCodes)[number];

export interface ReservationCustomer {
  name: string;
  email: string;
  phone: string | null;
}

export interface ReservationResponse {
  id: string;
  status: ReservationStatus;
  serviceId: string | null;
  serviceVariantId: string | null;
  serviceName: string;
  durationMinutes: number;
  price: Money;
  startsAt: string;
  endsAt: string;
  customer: ReservationCustomer;
  notes: string | null;
  locale?: 'pt' | 'en';
  rejectionReasonCode?: RejectionReasonCode | null;
  rejectionMessage?: string | null;
  decidedAt?: string | null;
  cancellationReasonCode?: CancellationReasonCode | null;
  cancellationMessage?: string | null;
}

export interface RejectReservationInput {
  reasonCode: RejectionReasonCode;
  message: string;
}

export interface CancelReservationInput {
  reasonCode: CancellationReasonCode;
  message: string;
}

export const paymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type AttentionReason = 'APPROVAL_REQUIRED' | 'OUTCOME_REQUIRED' | 'PAYMENT_DUE';

export interface PaymentSummary {
  totalPaidCents: number;
  balanceDueCents: number;
  currency: string;
  state: PaymentState;
}

export interface ReservationPayment {
  id: string;
  reservationId: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: 'PAID' | 'REFUNDED' | 'VOIDED';
  paidAt: string;
  reference: string | null;
}

export interface ReservationPayments {
  items: ReservationPayment[];
  summary: PaymentSummary;
}

export interface RecordPaymentInput {
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  paidAt?: string;
  reference?: string;
}

export interface CompleteReservationInput {
  payment?: RecordPaymentInput;
  discount?: {
    valueType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    valueAmount: number;
    validityDays: number;
    sameServiceOnly: boolean;
  };
}

export interface ReservationAttention {
  reservation: ReservationResponse;
  reason: AttentionReason;
  paymentSummary: PaymentSummary;
}

export interface ReservationAttentionPage {
  items: ReservationAttention[];
  page: number;
  size: number;
  total: number;
}

export interface ReservationPage {
  items: ReservationResponse[];
  page: number;
  size: number;
  total: number;
}

export type ReservationSort = 'STARTS_AT_ASC' | 'STARTS_AT_DESC';

export interface ReservationListParams {
  statuses?: ReadonlyArray<ReservationStatus>;
  from?: string;
  to?: string;
  historyBefore?: string;
  sort?: ReservationSort;
  page?: number;
  size?: number;
}

export function reservationStatusLabel(status: ReservationStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    case 'COMPLETED':
      return 'Completed';
    case 'NO_SHOW':
      return 'No-show';
  }
}

export function reservationStatusTone(
  status: ReservationStatus,
): StatusChipTone {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'muted';
  }
}
