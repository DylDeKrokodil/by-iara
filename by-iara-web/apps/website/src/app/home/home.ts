import {
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ServicesApi, Service, ServiceVariant } from '../services/services-api';
import { ToastService } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'byiara-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly language = inject(LanguageService);

  protected readonly featuredServices = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly copy = computed(() => this.language.messages().home);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFeaturedServices();
    } else {
      this.loading.set(false);
    }
  }

  protected loadFeaturedServices(): void {
    this.loading.set(true);
    this.hasError.set(false);
    this.api.list().subscribe({
      next: (data) => {
        const featured = data
          .filter((s) => s.featured && s.active)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        this.featuredServices.set(featured);
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
