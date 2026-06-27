import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ServicesApi, Service, ServiceVariant } from './services-api';
import { ToastService } from '@by-iara/shared-ui';

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

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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
    this.error.set(null);
    this.api.list().subscribe({
      next: (data) => {
        // Sort services by sortOrder
        const sorted = [...data].sort((a, b) => a.sortOrder - b.sortOrder);
        this.services.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the services catalog. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  protected formatPrice(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  protected onBook(service: Service, variant: ServiceVariant): void {
    this.toast.show(
      `Booking for "${service.name}" (${variant.durationMinutes} min) is coming soon!`,
      'success',
    );
  }
}
