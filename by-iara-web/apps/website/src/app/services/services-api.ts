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

export interface ServiceTranslation {
  name: string;
  description: string | null;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  featured: boolean;
  translations: Record<string, ServiceTranslation>;
  variants: ServiceVariant[];
}

/**
 * Resolves the service name/description for a locale, falling back to the base
 * columns when the requested locale has no translation row.
 */
export function localizedService(
  service: Service,
  locale: string,
): ServiceTranslation {
  return (
    service.translations?.[locale] ?? {
      name: service.name,
      description: service.description,
    }
  );
}

@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/services';

  list(): Observable<Service[]> {
    return this.http.get<Service[]>(this.baseUrl);
  }
}
