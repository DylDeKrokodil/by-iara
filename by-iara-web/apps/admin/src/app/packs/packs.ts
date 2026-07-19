import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alert, EmptyState, PageHeader } from '@by-iara/shared-ui';
import { CustomerPack, PacksApi } from './packs-api';

@Component({
  selector: 'byiara-packs',
  imports: [Alert, EmptyState, PageHeader, RouterLink],
  templateUrl: './packs.html',
  styleUrl: './packs.css',
})
export class Packs implements OnInit {
  private readonly api = inject(PacksApi);
  protected readonly packs = signal<CustomerPack[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (packs) => {
        this.packs.set(packs);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected money(pack: CustomerPack): string {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: pack.currency,
    }).format(pack.priceCents / 100);
  }

  protected date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
          new Date(value),
        )
      : '—';
  }

  protected statusLabel(status: CustomerPack['status']): string {
    return status.toLowerCase().replace('_', ' ');
  }
}
