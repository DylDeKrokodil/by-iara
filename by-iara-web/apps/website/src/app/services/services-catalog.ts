import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Alert, Button, Card, EmptyState, Skeleton } from '@by-iara/shared-ui';
import {
  ServicesApi,
  Service,
  ServiceTranslation,
  localizedService,
} from './services-api';
import { LanguageService } from '../i18n/language.service';
import { SeoService } from '../seo/seo.service';

interface StartingPrice {
  readonly original: string | null;
  readonly current: string;
}

@Component({
  selector: 'byiara-services-catalog',
  imports: [Alert, Button, Card, EmptyState, Skeleton, RouterLink],
  templateUrl: './services-catalog.html',
  styleUrl: './services-catalog.css',
})
export class ServicesCatalog implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly seo = inject(SeoService);

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly copy = computed(() => this.language.messages().services);
  protected readonly skeletonCards = [0, 1, 2, 3] as const;

  ngOnInit(): void {
    this.loadCatalog();
  }

  protected loadCatalog(): void {
    this.loading.set(true);
    this.hasError.set(false);
    this.api.list().subscribe({
      next: (data) => {
        const locale = this.language.current().locale;
        const sorted = data
          .filter((service) => service.translations[locale])
          .sort((a, b) => a.sortOrder - b.sortOrder);
        this.services.set(sorted);
        this.seo.updateCatalogStructuredData(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.loading.set(false);
      },
    });
  }

  protected formatPrice(cents: number): string {
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }

  protected startingPrice(service: Service): StartingPrice | null {
    const activeVariants = service.variants.filter((variant) => variant.active);

    if (activeVariants.length === 0) {
      return null;
    }
    const cheapest = activeVariants.reduce((current, variant) =>
      (variant.promotionalPrice?.amountCents ?? variant.price.amountCents) <
      (current.promotionalPrice?.amountCents ?? current.price.amountCents)
        ? variant
        : current,
    );
    const currentCents =
      cheapest.promotionalPrice?.amountCents ?? cheapest.price.amountCents;
    return {
      original: cheapest.promotionalPrice
        ? this.copy().priceFrom(this.formatPrice(cheapest.price.amountCents))
        : null,
      current: this.copy().priceFrom(this.formatPrice(currentCents)),
    };
  }

  protected localized(service: Service): ServiceTranslation {
    return localizedService(service, this.language.current().locale);
  }

  protected detailLink(service: Service): string[] {
    return this.language.localizedLink(
      'services',
      this.localized(service).slug,
    );
  }

  protected hasPackOffers(service: Service): boolean {
    return (service.packOffers ?? []).some(
      (offer) =>
        offer.active &&
        service.variants.some(
          (variant) =>
            variant.active && variant.durationMinutes === offer.durationMinutes,
        ),
    );
  }

  protected onBook(service: Service): void {
    this.router.navigate(this.language.localizedLink('book'), {
      queryParams: { service: service.slug },
    });
  }
}
