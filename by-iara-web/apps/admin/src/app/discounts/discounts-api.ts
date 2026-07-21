import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type DiscountAudience = 'PUBLIC' | 'PERSONAL';
export type DiscountScope = 'ALL_SERVICES' | 'SELECTED_SERVICES';
export type DiscountValueType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface Discount {
  id: string;
  name: string;
  audience: DiscountAudience;
  scope: DiscountScope;
  valueType: DiscountValueType;
  valueAmount: number;
  currency: string | null;
  startsAt: string;
  endsAt: string;
  maxUniqueClients: number | null;
  maxUsesPerCustomer: number;
  codeHint: string;
  customerEmail: string | null;
  status: DiscountStatus;
  serviceIds: string[];
  reservedUses: number;
  consumedUses: number;
  uniqueClients: number;
  publicCode: string | null;
  featured: boolean;
}

export interface DiscountInput {
  name: string;
  audience: DiscountAudience;
  scope: DiscountScope;
  valueType: DiscountValueType;
  valueAmount: number;
  currency?: string;
  startsAt: string;
  endsAt: string;
  maxUniqueClients?: number;
  maxUsesPerCustomer: number;
  serviceIds: string[];
  customerEmail?: string;
  code?: string;
  sendEmail?: boolean;
  featured?: boolean;
}

export interface DiscountUsage {
  id: string;
  reservationId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  originalPriceCents: number;
  discountAmountCents: number;
  finalPriceCents: number;
  currency: string;
  status: 'RESERVED' | 'CONSUMED' | 'RELEASED';
  reservedAt: string;
  consumedAt: string | null;
  releasedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class DiscountsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Discount[]> {
    return this.http.get<Discount[]>('/api/admin/discounts');
  }

  create(input: DiscountInput): Observable<{ discount: Discount; generatedCode: string | null; deliveryStatus: 'SENT' | 'FAILED' | null }> {
    return this.http.post<{ discount: Discount; generatedCode: string | null; deliveryStatus: 'SENT' | 'FAILED' | null }>('/api/admin/discounts', input);
  }

  updateStatus(id: string, status: DiscountStatus): Observable<Discount> {
    return this.http.patch<Discount>(`/api/admin/discounts/${id}/status`, { status });
  }

  updateFeatured(id: string, featured: boolean): Observable<Discount> {
    return this.http.patch<Discount>(`/api/admin/discounts/${id}/featured`, { featured });
  }

  usage(id: string): Observable<DiscountUsage[]> {
    return this.http.get<DiscountUsage[]>(`/api/admin/discounts/${id}/usage`);
  }
}
