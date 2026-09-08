import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
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
  promotionalPrice?: Money | null;
  promotion?: AutomaticPromotion;
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

export interface AutomaticPromotion {
  firstTimeCustomersOnly?: boolean;
  maxUsesPerCustomer?: number | null;
  name: string;
  serviceIds: string[];
  valueType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  valueAmount: number;
  currency: string | null;
  endsAt: string;
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
  private readonly promotionsUrl = apiUrl(
    inject(API_ORIGIN),
    '/api/discounts/automatic',
  );

  list(): Observable<Service[]> {
    return forkJoin({
      services: this.http.get<Service[]>(this.baseUrl),
      promotions: this.loadPromotions(),
    }).pipe(
      map(({ services, promotions }) =>
        applyAutomaticPromotions(services, promotions),
      ),
    );
  }

  get(locale: LocaleCode, slug: string): Observable<Service> {
    return forkJoin({
      service: this.http.get<Service>(
        `${this.baseUrl}/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`,
      ),
      promotions: this.loadPromotions(),
    }).pipe(
      map(
        ({ service, promotions }) =>
          applyAutomaticPromotions([service], promotions)[0],
      ),
    );
  }

  private loadPromotions(): Observable<AutomaticPromotion[]> {
    return this.http
      .get<AutomaticPromotion[]>(this.promotionsUrl)
      .pipe(catchError(() => of([])));
  }
}

export function applyAutomaticPromotions(
  services: Service[],
  promotions: AutomaticPromotion[],
): Service[] {
  return services.map((service) => {
    const applicable = promotions.filter((promotion) =>
      promotion.serviceIds.includes(service.id),
    );
    if (!applicable.length) return service;
    return {
      ...service,
      variants: service.variants.map((variant) => {
        const offers = applicable
          .filter(
            (promotion) =>
              promotion.valueType !== 'FIXED_AMOUNT' ||
              promotion.currency === variant.price.currency,
          )
          .map((promotion) => ({
            promotion,
            price: Math.max(
              0,
              variant.price.amountCents -
                (promotion.valueType === 'PERCENTAGE'
                  ? Math.round(
                      (variant.price.amountCents * promotion.valueAmount) /
                        10_000,
                    )
                  : promotion.valueAmount),
            ),
          }))
          .filter((offer) => offer.price < variant.price.amountCents)
          .sort((a, b) => a.price - b.price);
        const best = offers[0];
        return best
          ? {
              ...variant,
              promotionalPrice: { ...variant.price, amountCents: best.price },
              promotion: best.promotion,
            }
          : variant;
      }),
    };
  });
}
