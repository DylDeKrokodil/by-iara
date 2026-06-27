import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ServicesApi, Service, ServiceVariant } from '../services/services-api';
import { ToastService } from '@by-iara/shared-ui';

@Component({
  selector: 'byiara-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly featuredServices = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFeaturedServices();
    } else {
      this.loading.set(false);
    }
  }

  protected loadFeaturedServices(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (data) => {
        // Filter featured services and sort them by sortOrder
        const featured = data
          .filter((s) => s.featured && s.active)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        this.featuredServices.set(featured);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load featured services.');
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
