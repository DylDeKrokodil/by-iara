import {
  Component,
  RESPONSE_INIT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from '@by-iara/shared-ui';
import { LanguageService } from '../../i18n/language.service';
import { LocalePath } from '../../i18n/supported-locales';
import { SeoService } from '../../seo/seo.service';
import {
  localizedService,
  Service,
  ServicesApi,
} from '../../services/services-api';
import { Guide, GuideTranslation } from '../guides-api';

@Component({
  selector: 'byiara-guide-detail',
  imports: [Button, RouterLink],
  templateUrl: './guide-detail.html',
  styleUrl: './guide-detail.css',
})
export class GuideDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly responseInit = inject(RESPONSE_INIT);
  private readonly seo = inject(SeoService);
  private readonly servicesApi = inject(ServicesApi);

  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(
    () => this.language.messages().guideDetail,
  );
  protected readonly guide = this.route.snapshot.data['guide'] as Guide | null;
  protected readonly translation = computed<GuideTranslation | null>(() =>
    this.guide
      ? (this.guide.translations[this.language.current().locale] ?? null)
      : null,
  );
  protected readonly relatedServices = signal<Service[]>([]);

  constructor() {
    if (!this.guide && this.responseInit) this.responseInit.status = 404;
    const localePath = this.route.parent?.snapshot.data[
      'localePath'
    ] as LocalePath;
    this.seo.updateGuide(this.guide, localePath);
    if (this.guide?.relatedServiceIds.length) {
      const ids = new Set(this.guide.relatedServiceIds);
      this.servicesApi.list().subscribe({
        next: (services) =>
          this.relatedServices.set(
            services.filter(
              (service) =>
                ids.has(service.id) &&
                Boolean(service.translations[this.language.current().locale]),
            ),
          ),
      });
    }
  }

  protected serviceName(service: Service): string {
    return localizedService(service, this.language.current().locale).name;
  }

  protected serviceLink(service: Service): string[] {
    return this.language.localizedLink(
      'services',
      localizedService(service, this.language.current().locale).slug,
    );
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.language.current().locale, {
      dateStyle: 'long',
    }).format(new Date(value));
  }
}
