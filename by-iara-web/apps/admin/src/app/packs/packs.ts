import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Alert,
  Button,
  EmptyState,
  PageHeader,
  StatusChip,
  TabOption,
  Tabs,
} from '@by-iara/shared-ui';
import { ServicesApi } from '../services/services-api';
import type { PackOffer, Service } from '../services/service.models';
import { CustomerPack, PacksApi } from './packs-api';
import {
  connectFragmentTab,
  navigateToFragmentTab,
} from '../core/fragment-tab-state';

interface ConfiguredPackOffer {
  readonly service: Service;
  readonly offer: PackOffer;
  readonly perSessionCents: number;
}

const packTabValues = ['offers', 'customers'] as const;
type PacksTab = (typeof packTabValues)[number];

const packTabs: ReadonlyArray<TabOption> = [
  { label: 'Pack offers', value: 'offers' },
  { label: 'Customer packs', value: 'customers' },
];

@Component({
  selector: 'byiara-packs',
  imports: [
    Alert,
    Button,
    EmptyState,
    PageHeader,
    RouterLink,
    StatusChip,
    Tabs,
  ],
  templateUrl: './packs.html',
  styleUrl: './packs.css',
})
export class Packs implements OnInit {
  private readonly api = inject(PacksApi);
  private readonly servicesApi = inject(ServicesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly packs = signal<CustomerPack[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly services = signal<Service[]>([]);
  protected readonly offersLoading = signal(true);
  protected readonly offersError = signal(false);
  protected readonly activeTab = signal<PacksTab>('offers');
  protected readonly packTabs = packTabs;
  protected readonly configuredOffers = computed<ConfiguredPackOffer[]>(() =>
    [...this.services()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((service) =>
        [...service.packOffers]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((offer) => ({
            service,
            offer,
            perSessionCents: Math.round(
              offer.price.amountCents / offer.sessionCount,
            ),
          })),
      ),
  );
  protected readonly servicesWithOffers = computed(
    () => new Set(this.configuredOffers().map((item) => item.service.id)).size,
  );

  ngOnInit(): void {
    connectFragmentTab({
      allowedValues: packTabValues,
      defaultValue: 'offers',
      destroyRef: this.destroyRef,
      route: this.route,
      router: this.router,
      state: this.activeTab,
    });
    this.loadConfiguredOffers();
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

  protected money(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amountCents / 100);
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

  protected setActiveTab(value: string): void {
    if (value === 'offers' || value === 'customers') {
      this.activeTab.set(value);
      void navigateToFragmentTab(this.router, this.route, value);
    }
  }

  private loadConfiguredOffers(): void {
    this.servicesApi.list().subscribe({
      next: (services) => {
        this.services.set(services);
        this.offersLoading.set(false);
      },
      error: () => {
        this.offersError.set(true);
        this.offersLoading.set(false);
      },
    });
  }
}
