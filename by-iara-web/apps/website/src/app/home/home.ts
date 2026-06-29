import {
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  ServicesApi,
  Service,
  ServiceTranslation,
  ServiceVariant,
  localizedService,
} from '../services/services-api';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'byiara-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);
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

  protected localized(service: Service): ServiceTranslation {
    return localizedService(service, this.language.current().locale);
  }

  protected onBook(service: Service, variant: ServiceVariant): void {
    this.router.navigate(['/', this.language.current().path, 'book'], {
      queryParams: { service: service.slug, variant: variant.id },
    });
  }
}
