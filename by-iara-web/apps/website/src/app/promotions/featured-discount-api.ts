import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ORIGIN, apiUrl } from '../api-origin';

export interface FeaturedDiscount {
  name: string;
  code: string;
  valueType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  valueAmount: number;
  currency: string | null;
  endsAt: string;
}

@Injectable({ providedIn: 'root' })
export class FeaturedDiscountApi {
  private readonly http = inject(HttpClient);
  private readonly apiOrigin = inject(API_ORIGIN);

  get(): Observable<FeaturedDiscount | null> {
    return this.http.get<FeaturedDiscount | null>(apiUrl(this.apiOrigin, '/api/discounts/featured'));
  }
}
