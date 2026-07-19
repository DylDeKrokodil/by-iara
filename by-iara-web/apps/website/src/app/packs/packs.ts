import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Alert, Button, EmptyState, Spinner } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';
import {
  Service,
  ServiceTranslation,
  ServicesApi,
  localizedService,
} from '../services/services-api';
import { PackPresentation, packPresentations } from './pack-presentation';

interface PackServiceGroup {
  readonly service: Service;
  readonly offers: readonly PackPresentation[];
}

@Component({
  selector: 'byiara-packs',
  imports: [Alert, Button, EmptyState, RouterLink, Spinner],
  templateUrl: './packs.html',
  styleUrl: './packs.css',
})
export class Packs implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().packs);
  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly groups = computed<PackServiceGroup[]>(() => {
    const allOffers = packPresentations(this.services());
    return this.services().flatMap((service) => {
      const offers = allOffers.filter((item) => item.service.id === service.id);
      return offers.length ? [{ service, offers }] : [];
    });
  });

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (services) => {
        const locale = this.language.current().locale;
        this.services.set(
          [...services]
            .filter((service) => service.active && service.translations[locale])
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.hasError.set(true);
      },
    });
  }

  protected localized(service: Service): ServiceTranslation {
    return localizedService(service, this.language.current().locale);
  }

  protected formatPrice(cents: number): string {
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  }

  protected onBook(item: PackPresentation): void {
    this.router.navigate(this.language.localizedLink('book'), {
      queryParams: {
        service: item.service.slug,
        variant: item.variant.id,
        pack: item.offer.id,
      },
    });
  }
}
