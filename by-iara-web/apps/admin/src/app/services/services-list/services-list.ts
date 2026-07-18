import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ServicesApi } from '../services-api';
import {
  formatMoney,
  Service,
  ServiceSort,
  SortDirection,
} from '../service.models';
import {
  Alert,
  Button,
  ConfirmationModal,
  DataTable,
  DataTableColumn,
  DataTableSort,
  EmptyState,
  PageHeader,
  SelectField,
  StatusChip,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';

const serviceStatusFilterValues = ['all', 'active', 'inactive'] as const;

type ServiceStatusFilter = (typeof serviceStatusFilterValues)[number];

const statusFilters: ReadonlyArray<{
  label: string;
  value: ServiceStatusFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const serviceTableColumns: ReadonlyArray<DataTableColumn> = [
  { key: 'NAME', label: 'Name', sortable: true },
  { key: 'DURATION', label: 'Duration', sortable: true, fit: true },
  { key: 'PRICE', label: 'Price', sortable: true, fit: true },
  {
    key: 'DISPLAY_ORDER',
    label: 'Display order',
    sortable: true,
    fit: true,
  },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', fit: true },
];

function isServiceStatusFilter(value: string): value is ServiceStatusFilter {
  return serviceStatusFilterValues.includes(value as ServiceStatusFilter);
}

@Component({
  selector: 'byiara-services-list',
  imports: [
    Alert,
    Button,
    EmptyState,
    PageHeader,
    StatusChip,
    ConfirmationModal,
    SelectField,
    DataTable,
    TextField,
    ReactiveFormsModule,
  ],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css',
})
export class ServicesList implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private requestId = 0;

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedStatus = signal<ServiceStatusFilter>('all');
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = signal('');
  protected readonly sortKey = signal<ServiceSort>('DISPLAY_ORDER');
  protected readonly sortDirection = signal<SortDirection>('ASC');
  protected readonly hasFilters = computed(
    () => this.selectedStatus() !== 'all' || Boolean(this.searchQuery()),
  );
  protected readonly statusFilters = statusFilters;
  protected readonly serviceTableColumns = serviceTableColumns;

  protected readonly formatMoney = formatMoney;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.searchQuery.set(value.trim());
        this.reload();
      });
    this.reload();
  }

  @ViewChild('confirmDeactivateModal')
  private confirmDeactivateModal!: ConfirmationModal;
  protected serviceToDeactivate = signal<Service | null>(null);

  protected reload(): void {
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        active: this.activeFilter(),
        query: this.searchQuery() || undefined,
        sort: this.sortKey(),
        direction: this.sortDirection(),
      })
      .subscribe({
        next: (services) => {
          if (requestId !== this.requestId) {
            return;
          }
          this.services.set(services);
          this.loading.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) {
            return;
          }
          this.error.set('Could not load services.');
          this.loading.set(false);
        },
      });
  }

  protected setStatusFilter(filter: ServiceStatusFilter): void {
    if (this.selectedStatus() === filter) {
      return;
    }

    this.selectedStatus.set(filter);
    this.reload();
  }

  protected onStatusFilterChange(filter: string): void {
    if (!isServiceStatusFilter(filter)) {
      return;
    }

    this.setStatusFilter(filter);
  }

  protected onSortChange(sort: DataTableSort): void {
    if (!isServiceSort(sort.key)) {
      return;
    }

    this.sortKey.set(sort.key);
    this.sortDirection.set(sort.direction === 'asc' ? 'ASC' : 'DESC');
    this.reload();
  }

  protected clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.searchQuery.set('');
    this.selectedStatus.set('all');
    this.reload();
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
        this.toast.show(
          `Service "${service.name}" deactivated successfully.`,
          'success',
        );
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

  protected durationSummary(service: Service): string {
    const durations = service.variants
      .filter((variant) => variant.active)
      .map((variant) => variant.durationMinutes);
    if (durations.length === 0) {
      return 'No active options';
    }

    const shortest = Math.min(...durations);
    const longest = Math.max(...durations);
    return shortest === longest
      ? `${shortest} min`
      : `${shortest}–${longest} min`;
  }

  protected priceSummary(service: Service): string {
    const variants = service.variants.filter((variant) => variant.active);
    if (variants.length === 0) {
      return '—';
    }

    const prices = variants.map((variant) => variant.price.amountCents);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const currency = variants[0].price.currency;
    const format = (amountCents: number) =>
      this.formatMoney({ amountCents, currency });
    return lowest === highest
      ? format(lowest)
      : `${format(lowest)}–${format(highest)}`;
  }

  private activeFilter(): boolean | undefined {
    switch (this.selectedStatus()) {
      case 'active':
        return true;
      case 'inactive':
        return false;
      default:
        return undefined;
    }
  }
}

function isServiceSort(value: string): value is ServiceSort {
  return ['DISPLAY_ORDER', 'NAME', 'DURATION', 'PRICE'].includes(value);
}
