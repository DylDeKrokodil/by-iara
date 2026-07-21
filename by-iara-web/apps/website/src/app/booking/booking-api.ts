import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ORIGIN, apiUrl } from '../api-origin';

// The catalog/slots are computed in the business timezone, so display them there
// too, regardless of the visitor's browser timezone.
export const BUSINESS_TIMEZONE = 'Europe/Brussels';

export interface CreateReservationPayload {
  serviceId: string;
  serviceVariantId: string;
  startsAt: string;
  customer: { name: string; email: string; phone: string | null };
  notes: string | null;
  /** Language the confirmation/rejection email should be sent in. */
  locale: 'pt' | 'en';
  packOfferId?: string | null;
  customerPackId?: string | null;
  customerSessionToken?: string | null;
  discountCode?: string | null;
}

export interface ReservationConfirmation {
  id: string;
  status: string;
  serviceName: string;
  durationMinutes: number;
  price: { amountCents: number; currency: string };
  startsAt: string;
  endsAt: string;
  customer: { name: string; email: string; phone: string | null };
}

export interface CustomerPack {
  id: string;
  serviceId: string | null;
  serviceName: string;
  durationMinutes: number;
  totalSessions: number;
  remainingSessions: number;
  expiresAt: string | null;
}

export interface CustomerAccess {
  sessionToken: string;
  customer: { name: string; email: string; phone: string | null };
  packs: CustomerPack[];
}

export interface DiscountQuote {
  originalPrice: { amountCents: number; currency: string };
  discountAmount: { amountCents: number; currency: string };
  finalPrice: { amountCents: number; currency: string };
}

@Injectable({ providedIn: 'root' })
export class BookingApi {
  private readonly http = inject(HttpClient);
  private readonly apiOrigin = inject(API_ORIGIN);

  /** Bookable slot start times (ISO offset date-times) for a selected catalog option. */
  availableSlots(
    startDate: string,
    endDate: string,
    serviceId: string,
    serviceVariantId: string,
  ): Observable<string[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('serviceId', serviceId)
      .set('serviceVariantId', serviceVariantId);
    return this.http.get<string[]>(
      apiUrl(this.apiOrigin, '/api/reservations/availability'),
      { params },
    );
  }

  createReservation(
    payload: CreateReservationPayload,
  ): Observable<ReservationConfirmation> {
    return this.http.post<ReservationConfirmation>(
      apiUrl(this.apiOrigin, '/api/reservations'),
      payload,
    );
  }

  previewDiscount(input: {
    serviceId: string;
    serviceVariantId: string;
    customerEmail: string;
    discountCode: string;
  }): Observable<DiscountQuote> {
    return this.http.post<DiscountQuote>(
      apiUrl(this.apiOrigin, '/api/reservations/discount-preview'),
      input,
    );
  }

  requestPackAccess(email: string, locale: 'pt' | 'en'): Observable<void> {
    return this.http.post<void>(
      apiUrl(this.apiOrigin, '/api/customer-access/request'),
      { email, locale },
    );
  }

  exchangePackAccess(token: string): Observable<CustomerAccess> {
    return this.http.post<CustomerAccess>(
      apiUrl(this.apiOrigin, '/api/customer-access/exchange'),
      { token },
    );
  }

  customerPacks(sessionToken: string): Observable<CustomerPack[]> {
    return this.http.get<CustomerPack[]>(
      apiUrl(this.apiOrigin, '/api/customer-access/packs'),
      { headers: { 'X-Customer-Session': sessionToken } },
    );
  }

  /**
   * Earliest bookable slot from now on (ISO offset date-time), falling back to
   * the next open day when today has nothing left. Null only if nothing is
   * bookable in the search window at all.
   */
  nextAvailable(): Observable<string | null> {
    return this.http
      .get<{
        startsAt: string | null;
      }>(apiUrl(this.apiOrigin, '/api/reservations/next-available'))
      .pipe(map((response) => response.startsAt));
  }
}
