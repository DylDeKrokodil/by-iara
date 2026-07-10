import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class BookingApi {
  private readonly http = inject(HttpClient);

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
    return this.http.get<string[]>('/api/reservations/availability', { params });
  }

  createReservation(
    payload: CreateReservationPayload,
  ): Observable<ReservationConfirmation> {
    return this.http.post<ReservationConfirmation>('/api/reservations', payload);
  }

  /**
   * Earliest bookable slot from now on (ISO offset date-time), falling back to
   * the next open day when today has nothing left. Null only if nothing is
   * bookable in the search window at all.
   */
  nextAvailable(): Observable<string | null> {
    return this.http
      .get<{ startsAt: string | null }>('/api/reservations/next-available')
      .pipe(map((response) => response.startsAt));
  }
}
