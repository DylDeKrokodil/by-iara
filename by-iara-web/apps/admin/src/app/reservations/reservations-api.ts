import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ReservationListParams,
  ReservationPage,
  ReservationResponse,
} from './reservation.models';

@Injectable({ providedIn: 'root' })
export class ReservationsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/reservations';

  list(filters: ReservationListParams = {}): Observable<ReservationPage> {
    let params = new HttpParams();

    for (const status of filters.statuses ?? []) {
      params = params.append('status', status);
    }

    if (filters.from) {
      params = params.set('from', filters.from);
    }

    if (filters.to) {
      params = params.set('to', filters.to);
    }

    if (filters.historyBefore) {
      params = params.set('historyBefore', filters.historyBefore);
    }

    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }

    if (filters.page !== undefined) {
      params = params.set('page', filters.page);
    }

    if (filters.size !== undefined) {
      params = params.set('size', filters.size);
    }

    return this.http.get<ReservationPage>(this.baseUrl, { params });
  }

  confirm(id: string): Observable<ReservationResponse> {
    return this.http.patch<ReservationResponse>(
      `${this.baseUrl}/${id}/confirm`,
      {},
    );
  }

  reject(id: string): Observable<ReservationResponse> {
    return this.http.patch<ReservationResponse>(
      `${this.baseUrl}/${id}/reject`,
      {},
    );
  }
}
