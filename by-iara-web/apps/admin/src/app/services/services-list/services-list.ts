import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicesApi } from '../services-api';
import { formatMoney, Service, ServiceVariant } from '../service.models';
import { StatusChip, DurationChip } from '@by-iara/shared-ui';

@Component({
  selector: 'byiara-services-list',
  imports: [RouterLink, StatusChip, DurationChip],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css',
})
export class ServicesList implements OnInit {
  private readonly api = inject(ServicesApi);

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly formatMoney = formatMoney;

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load services.');
        this.loading.set(false);
      },
    });
  }

  protected deactivate(service: Service): void {
    if (!confirm(`Deactivate "${service.name}"? It will be hidden from the public catalogue.`)) {
      return;
    }
    this.api.remove(service.id).subscribe({
      next: () => this.reload(),
      error: () => this.error.set('Could not deactivate the service.'),
    });
  }

  protected variantLabel(variant: ServiceVariant): string {
    return `${variant.durationMinutes} min · ${this.formatMoney(variant.price)}`;
  }
}
