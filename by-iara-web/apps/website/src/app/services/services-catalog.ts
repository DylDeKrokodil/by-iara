import {
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ServicesApi, Service, ServiceVariant } from './services-api';
import { ToastService } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'byiara-services-catalog',
  imports: [],
  templateUrl: './services-catalog.html',
  styleUrl: './services-catalog.css',
})
export class ServicesCatalog implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly language = inject(LanguageService);

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly copy = computed(() => this.language.messages().services);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCatalog();
    } else {
      // In SSR / Prerendering environment, don't attempt to fetch relative api routes
      this.loading.set(false);
    }
  }

  protected loadCatalog(): void {
    this.loading.set(true);
    this.hasError.set(false);
    this.api.list().subscribe({
      next: (data) => {
        const sorted = [...data].sort((a, b) => a.sortOrder - b.sortOrder);
        this.services.set(sorted);
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
    }).format(cents / 100);
  }

  protected onBook(service: Service, variant: ServiceVariant): void {
    this.toast.show(
      this.copy().bookingComingSoon(service.name, variant.durationMinutes),
      'success',
    );
  }
}
