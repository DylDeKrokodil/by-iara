import { Money } from '../services/service.models';
import { StatusChipTone } from '@by-iara/shared-ui';

export const reservationStatuses = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
] as const;

export type ReservationStatus = (typeof reservationStatuses)[number];

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
      return 'muted';
  }
}
