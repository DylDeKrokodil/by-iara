import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  Alert,
  Button,
  ConfirmationModal,
  DataTable,
  DataTableColumn,
  EmptyState,
  PageHeader,
  StatusChip,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';
import {
  CustomerPackStatus,
  CustomerSearchResult,
} from './customer.models';
import { CustomersApi } from './customers-api';

const pageSize = 20;

const customerColumns: ReadonlyArray<DataTableColumn> = [
  { key: 'customer', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'reservations', label: 'Reservations', fit: true },
  { key: 'packs', label: 'Packs' },
  { key: 'lastCompleted', label: 'Last completed', fit: true },
  { key: 'nextBooking', label: 'Next booking', fit: true },
  { key: 'actions', label: 'Actions', fit: true },
];

@Component({
  selector: 'byiara-customers',
  imports: [
    Alert,
    Button,
    ConfirmationModal,
    DataTable,
    EmptyState,
    PageHeader,
    ReactiveFormsModule,
    StatusChip,
    TextField,
  ],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class Customers implements OnInit {
  private readonly api = inject(CustomersApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private requestId = 0;

  @ViewChild('anonymiseModal')
  private anonymiseModal!: ConfirmationModal;

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly customers = signal<readonly CustomerSearchResult[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly searchedEmail = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly total = signal(0);
  protected readonly customerColumns = customerColumns;
  protected readonly customerToAnonymise =
    signal<CustomerSearchResult | null>(null);
  protected readonly anonymisingCustomerId = signal<string | null>(null);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / pageSize)),
  );
  protected readonly canGoBack = computed(() => this.page() > 0);
  protected readonly canGoForward = computed(
    () => this.page() + 1 < this.totalPages(),
  );

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        const email = value.trim();
        this.searchTerm.set(email);
        this.page.set(0);
        if (email.length < 2) {
          this.requestId++;
          this.customers.set([]);
          this.searchedEmail.set('');
          this.total.set(0);
          this.loading.set(false);
          this.error.set(null);
          return;
        }
        this.search(email, 0);
      });
  }

  protected previousPage(): void {
    if (this.canGoBack()) {
      this.search(this.searchedEmail(), this.page() - 1);
    }
  }

  protected nextPage(): void {
    if (this.canGoForward()) {
      this.search(this.searchedEmail(), this.page() + 1);
    }
  }

  protected clearSearch(): void {
    this.requestId++;
    this.searchControl.setValue('', { emitEvent: false });
    this.searchTerm.set('');
    this.customers.set([]);
    this.searchedEmail.set('');
    this.total.set(0);
    this.page.set(0);
    this.loading.set(false);
    this.error.set(null);
  }

  protected requestAnonymisation(customer: CustomerSearchResult): void {
    this.customerToAnonymise.set(customer);
    this.anonymiseModal.open();
  }

  protected confirmAnonymisation(): void {
    const customer = this.customerToAnonymise();
    if (!customer) {
      return;
    }

    this.anonymisingCustomerId.set(customer.id);
    this.api.anonymise(customer.id).subscribe({
      next: () => {
        this.customerToAnonymise.set(null);
        this.anonymisingCustomerId.set(null);
        this.page.set(0);
        this.search(this.searchedEmail(), 0);
        this.toast.show('Customer personal data was anonymised.', 'success');
      },
      error: () => {
        this.customerToAnonymise.set(null);
        this.anonymisingCustomerId.set(null);
        this.toast.show('Could not anonymise the customer.', 'error');
      },
    });
  }

  protected cancelAnonymisation(): void {
    this.customerToAnonymise.set(null);
  }

  protected formatDateTime(value: string | null): string {
    if (!value) {
      return '—';
    }
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected formatDate(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
          new Date(value),
        )
      : 'No expiry';
  }

  protected formatMoney(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amountCents / 100);
  }

  protected packStatusLabel(status: CustomerPackStatus): string {
    return status.toLowerCase().replace('_', ' ');
  }

  protected packStatusTone(
    status: CustomerPackStatus,
  ): 'success' | 'warning' | 'muted' {
    if (status === 'ACTIVE') {
      return 'success';
    }
    if (status === 'PENDING_PAYMENT') {
      return 'warning';
    }
    return 'muted';
  }

  private search(email: string, page: number): void {
    const requestId = ++this.requestId;
    this.searchedEmail.set(email);
    this.loading.set(true);
    this.error.set(null);
    this.api.search(email, page, pageSize).subscribe({
      next: (result) => {
        if (requestId !== this.requestId) {
          return;
        }
        this.customers.set(result.items);
        this.searchedEmail.set(email);
        this.page.set(result.page);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.requestId) {
          return;
        }
        this.customers.set([]);
        this.searchedEmail.set(email);
        this.total.set(0);
        this.loading.set(false);
        this.error.set('Could not search customer records.');
      },
    });
  }
}
