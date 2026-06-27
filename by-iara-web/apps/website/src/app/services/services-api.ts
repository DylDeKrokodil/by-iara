import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Money {
  amountCents: number;
  currency: string;
}

export interface ServiceVariant {
  id: string;
  durationMinutes: number;
  price: Money;
  active: boolean;
  sortOrder: number;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  featured: boolean;
  variants: ServiceVariant[];
}

@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/services';

  list(): Observable<Service[]> {
    return this.http.get<Service[]>(this.baseUrl);
  }
}
