import { Component, RESPONSE_INIT, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from '@by-iara/shared-ui';
import { LanguageService } from '../../i18n/language.service';
import type { Service, ServiceTranslation } from '../services-api';
import { SeoService } from '../../seo/seo.service';
import {
  PackPresentation,
  servicePackPresentations,
} from '../../packs/pack-presentation';

@Component({
  selector: 'byiara-service-detail',
  imports: [Button, RouterLink],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
})
export class ServiceDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly responseInit = inject(RESPONSE_INIT);
  private readonly seo = inject(SeoService);

  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(
    () => this.language.messages().serviceDetail,
  );
  protected readonly service = this.route.snapshot.data[
    'service'
  ] as Service | null;
  protected readonly translation = computed<ServiceTranslation | null>(() =>
    this.service
      ? (this.service.translations[this.language.current().locale] ?? null)
      : null,
  );
  protected readonly packOffers = computed(() =>
    this.service ? servicePackPresentations(this.service) : [],
  );

  constructor() {
    if (!this.service && this.responseInit) {
      this.responseInit.status = 404;
    }
    this.seo.updateService(this.service);
  }

  protected formatPrice(cents: number): string {
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  }

  protected onBook(variantId: string): void {
    if (!this.service) {
      return;
    }
    this.router.navigate(this.language.localizedLink('book'), {
      queryParams: { service: this.service.slug, variant: variantId },
    });
  }

  protected onBookPack(item: PackPresentation): void {
    if (!this.service) return;
    this.router.navigate(this.language.localizedLink('book'), {
      queryParams: {
        service: this.service.slug,
        variant: item.variant.id,
        pack: item.offer.id,
      },
    });
  }
}
