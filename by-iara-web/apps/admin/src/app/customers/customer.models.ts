export type CustomerPackStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'EXHAUSTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface CustomerPackSummary {
  readonly id: string;
  readonly status: CustomerPackStatus;
  readonly serviceName: string;
  readonly durationMinutes: number;
  readonly totalSessions: number;
  readonly remainingSessions: number;
  readonly priceCents: number;
  readonly currency: string;
  readonly expiresAt: string | null;
}

export interface CustomerSearchResult {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly reservationCount: number;
  readonly completedReservationCount: number;
  readonly activeReservationCount: number;
  readonly lastCompletedAt: string | null;
  readonly nextReservationAt: string | null;
  readonly packs: readonly CustomerPackSummary[];
}

export interface CustomerSearchPage {
  readonly items: readonly CustomerSearchResult[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}
