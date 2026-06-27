import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicesApi } from '../services-api';
import { formatMoney, Service, ServiceVariant } from '../service.models';
import { StatusChip, DurationChip, ConfirmationModal, ToastService } from '@by-iara/shared-ui';

@Component({
  selector: 'byiara-services-list',
  imports: [RouterLink, StatusChip, DurationChip, ConfirmationModal],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css',
})
export class ServicesList implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly toast = inject(ToastService);

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly formatMoney = formatMoney;

  ngOnInit(): void {
    this.reload();
  }

  @ViewChild('confirmDeactivateModal') private confirmDeactivateModal!: ConfirmationModal;
  protected serviceToDeactivate = signal<Service | null>(null);

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
    this.serviceToDeactivate.set(service);
    this.confirmDeactivateModal.open();
  }

  protected onConfirmDeactivate(): void {
    const service = this.serviceToDeactivate();
    if (!service) return;

    this.api.remove(service.id).subscribe({
      next: () => {
        this.reload();
        this.toast.show(`Service "${service.name}" deactivated successfully.`, 'success');
        this.serviceToDeactivate.set(null);
      },
      error: () => {
        this.toast.show('Could not deactivate the service.', 'error');
        this.serviceToDeactivate.set(null);
      },
    });
  }

  protected onCancelDeactivate(): void {
    this.serviceToDeactivate.set(null);
  }

  protected variantLabel(variant: ServiceVariant): string {
    return `${variant.durationMinutes} min · ${this.formatMoney(variant.price)}`;
  }
}
