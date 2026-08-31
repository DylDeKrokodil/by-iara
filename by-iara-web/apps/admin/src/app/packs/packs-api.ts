import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CustomerPack {
  id: string;
  customerName: string;
  customerEmail: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'CANCELLED';
  serviceName: string;
  durationMinutes: number;
  totalSessions: number;
  remainingSessions: number;
  priceCents: number;
  currency: string;
  activatedAt: string | null;
  expiresAt: string | null;
  originatingReservationId: string;
}

@Injectable({ providedIn: 'root' })
export class PacksApi {
  private readonly http = inject(HttpClient);

  list(): Observable<CustomerPack[]> {
    return this.http.get<CustomerPack[]>('/api/admin/packs');
  }
}
