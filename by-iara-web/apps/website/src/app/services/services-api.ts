import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ORIGIN, apiUrl } from '../api-origin';
import type { LocaleCode } from '../i18n/supported-locales';

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

export interface PackOffer {
  id: string;
  durationMinutes: number;
  sessionCount: number;
  price: Money;
  validityDays: number | null;
  active: boolean;
  sortOrder: number;
}

export interface ServiceTranslation {
  slug: string;
  name: string;
  description: string | null;
  treatmentDescription: string | null;
  suitableFor: string | null;
  sessionDescription: string | null;
  faqs: ServiceFaq[];
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  featured: boolean;
  image: ServiceImage | null;
  translations: Record<string, ServiceTranslation>;
  variants: ServiceVariant[];
  packOffers?: PackOffer[];
  updatedAt?: string;
}

export interface ServiceImage {
  url: string;
  width: number;
  height: number;
  byteSize: number;
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
      slug: service.slug,
      name: service.name,
      description: service.description,
      treatmentDescription: null,
      suitableFor: null,
      sessionDescription: null,
      faqs: [],
    }
  );
}

@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiUrl(inject(API_ORIGIN), '/api/services');

  list(): Observable<Service[]> {
    return this.http.get<Service[]>(this.baseUrl);
  }

  get(locale: LocaleCode, slug: string): Observable<Service> {
    return this.http.get<Service>(
      `${this.baseUrl}/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`,
    );
  }
}
