import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateReservationPayload {
  serviceId: string;
  serviceVariantId: string;
  startsAt: string;
  customer: { name: string; email: string; phone: string | null };
  notes: string | null;
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
}
