import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  PageHeader,
  SelectField,
  SelectFieldOption,
  StatusChip,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';
import { ServicesApi } from '../services/services-api';
import type { Service } from '../services/service.models';
import {
  Discount,
  DiscountAudience,
  DiscountScope,
  DiscountsApi,
  DiscountStatus,
  DiscountUsage,
  DiscountValueType,
} from './discounts-api';

const audienceOptions: SelectFieldOption[] = [
  { label: 'Public code', value: 'PUBLIC' },
  { label: 'Personal customer code', value: 'PERSONAL' },
];
const scopeOptions: SelectFieldOption[] = [
  { label: 'Any individual service', value: 'ALL_SERVICES' },
  { label: 'Selected services', value: 'SELECTED_SERVICES' },
];
const valueTypeOptions: SelectFieldOption[] = [
  { label: 'Percentage', value: 'PERCENTAGE' },
  { label: 'Fixed euro amount', value: 'FIXED_AMOUNT' },
];

@Component({
  selector: 'byiara-discounts',
  imports: [
    Alert,
    Button,
    Card,
    Checkbox,
    EmptyState,
    PageHeader,
    ReactiveFormsModule,
    RouterLink,
    SelectField,
    StatusChip,
    TextField,
  ],
  templateUrl: './discounts.html',
  styleUrl: './discounts.css',
})
export class Discounts implements OnInit {
  private readonly api = inject(DiscountsApi);
  private readonly servicesApi = inject(ServicesApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly discounts = signal<Discount[]>([]);
  protected readonly services = signal<Service[]>([]);
  protected readonly usage = signal<DiscountUsage[]>([]);
  protected readonly selectedDiscount = signal<Discount | null>(null);
  protected readonly loading = signal(true);
  protected readonly usageLoading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly generatedCode = signal<string | null>(null);
  protected readonly selectedServiceIds = signal<Set<string>>(new Set());
  protected readonly audience = signal<DiscountAudience>('PUBLIC');
  protected readonly scope = signal<DiscountScope>('ALL_SERVICES');
  protected readonly valueType = signal<DiscountValueType>('PERCENTAGE');

  protected readonly audienceOptions = audienceOptions;
  protected readonly scopeOptions = scopeOptions;
  protected readonly valueTypeOptions = valueTypeOptions;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    code: ['', Validators.maxLength(100)],
    customerEmail: ['', Validators.email],
    value: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]],
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required],
    maxClients: ['', Validators.pattern(/^\d+$/)],
    maxUsesPerCustomer: ['1', [Validators.required, Validators.pattern(/^\d+$/)]],
    sendEmail: [true],
    featured: [false],
  });

  protected readonly activeCount = computed(
    () => this.discounts().filter((discount) => this.displayStatus(discount) === 'Active').length,
  );

  ngOnInit(): void {
    this.load();
    this.servicesApi.list({ active: true }).subscribe({ next: (services) => this.services.set(services) });
  }

  protected openForm(): void {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 86_400_000);
    this.form.reset({
      name: '', code: '', customerEmail: '', value: '',
      startsAt: this.localDateTime(now), endsAt: this.localDateTime(end),
      maxClients: '', maxUsesPerCustomer: '1',
      sendEmail: true,
      featured: false,
    });
    this.audience.set('PUBLIC');
    this.scope.set('ALL_SERVICES');
    this.valueType.set('PERCENTAGE');
    this.selectedServiceIds.set(new Set());
    this.generatedCode.set(null);
    this.error.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  protected setAudience(value: string): void {
    if (value === 'PUBLIC' || value === 'PERSONAL') this.audience.set(value);
  }

  protected setScope(value: string): void {
    if (value === 'ALL_SERVICES' || value === 'SELECTED_SERVICES') this.scope.set(value);
  }

  protected setValueType(value: string): void {
    if (value === 'PERCENTAGE' || value === 'FIXED_AMOUNT') this.valueType.set(value);
  }

  protected toggleService(serviceId: string, checked: boolean): void {
    this.selectedServiceIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(serviceId);
      } else {
        next.delete(serviceId);
      }
      return next;
    });
  }

  protected submit(): void {
    const raw = this.form.getRawValue();
    if (this.form.invalid || this.submitting() ||
      (this.audience() === 'PERSONAL' && !raw.customerEmail.trim()) ||
      (this.scope() === 'SELECTED_SERVICES' && this.selectedServiceIds().size === 0)
    ) {
      this.form.markAllAsTouched();
      this.error.set('Complete the required discount details.');
      return;
    }
    const numericValue = Number(raw.value.replace(',', '.'));
    const valueAmount = this.valueType() === 'PERCENTAGE'
      ? Math.round(numericValue * 100)
      : Math.round(numericValue * 100);
    this.submitting.set(true);
    this.error.set(null);
    this.api.create({
      name: raw.name.trim(),
      audience: this.audience(),
      scope: this.scope(),
      valueType: this.valueType(),
      valueAmount,
      currency: this.valueType() === 'FIXED_AMOUNT' ? 'EUR' : undefined,
      startsAt: new Date(raw.startsAt).toISOString(),
      endsAt: new Date(raw.endsAt).toISOString(),
      maxUniqueClients: raw.maxClients ? Number(raw.maxClients) : undefined,
      maxUsesPerCustomer: Number(raw.maxUsesPerCustomer),
      serviceIds: [...this.selectedServiceIds()],
      customerEmail: this.audience() === 'PERSONAL' ? raw.customerEmail.trim() : undefined,
      code: this.audience() === 'PUBLIC' ? raw.code.trim() || undefined : undefined,
      sendEmail: this.audience() === 'PERSONAL' && raw.sendEmail,
      featured: this.audience() === 'PUBLIC' && raw.featured,
    }).subscribe({
      next: ({ discount, generatedCode, deliveryStatus }) => {
        this.submitting.set(false);
        this.generatedCode.set(generatedCode);
        this.discounts.update((items) => [discount, ...items]);
        this.selectedDiscount.set(discount);
        this.loadUsage(discount);
        if (!generatedCode) this.formOpen.set(false);
        if (deliveryStatus === 'FAILED') {
          this.toast.show('Discount created, but the email could not be sent. Check email logs and copy the code.', 'error');
        } else if (deliveryStatus === 'SENT') {
          this.toast.show('Discount created and emailed to the customer.', 'success');
        } else {
          this.toast.show('Discount created.', 'success');
        }
      },
      error: (response: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(response.error?.message || 'Could not create the discount.');
      },
    });
  }

  protected select(discount: Discount): void {
    this.selectedDiscount.set(discount);
    this.loadUsage(discount);
  }

  protected updateStatus(discount: Discount, status: DiscountStatus): void {
    this.api.updateStatus(discount.id, status).subscribe({
      next: (updated) => {
        this.discounts.update((items) => items.map((item) => item.id === updated.id ? updated : item));
        this.selectedDiscount.set(updated);
        this.toast.show(`Discount ${status.toLowerCase()}.`, 'success');
      },
      error: () => this.toast.show('Could not update the discount.', 'error'),
    });
  }

  protected updateFeatured(discount: Discount, featured: boolean): void {
    this.api.updateFeatured(discount.id, featured).subscribe({
      next: (updated) => {
        this.discounts.update((items) => items.map((item) => ({
          ...item,
          featured: item.id === updated.id ? updated.featured : false,
        })));
        this.selectedDiscount.set(updated);
        this.toast.show(featured ? 'Discount featured on the website.' : 'Discount removed from the website.', 'success');
      },
      error: (response: HttpErrorResponse) => this.toast.show(response.error?.message || 'Could not update the featured discount.', 'error'),
    });
  }

  protected benefit(discount: Discount): string {
    return discount.valueType === 'PERCENTAGE'
      ? `${discount.valueAmount / 100}%`
      : this.money(discount.valueAmount, discount.currency || 'EUR');
  }

  protected serviceScope(discount: Discount): string {
    if (discount.scope === 'ALL_SERVICES') return 'All services';
    const names = this.services().filter((service) => discount.serviceIds.includes(service.id)).map((service) => service.name);
    return names.length ? names.join(', ') : `${discount.serviceIds.length} selected services`;
  }

  protected displayStatus(discount: Discount): string {
    if (discount.status !== 'ACTIVE') return discount.status === 'PAUSED' ? 'Paused' : 'Archived';
    const now = Date.now();
    if (new Date(discount.startsAt).getTime() > now) return 'Scheduled';
    if (new Date(discount.endsAt).getTime() <= now) return 'Expired';
    return 'Active';
  }

  protected statusTone(discount: Discount): 'success' | 'warning' | 'muted' {
    const status = this.displayStatus(discount);
    return status === 'Active' ? 'success' : status === 'Scheduled' || status === 'Paused' ? 'warning' : 'muted';
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));
  }

  protected money(cents: number, currency: string): string {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(cents / 100);
  }

  private load(): void {
    this.api.list().subscribe({
      next: (discounts) => { this.discounts.set(discounts); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Could not load discounts.'); },
    });
  }

  private loadUsage(discount: Discount): void {
    this.usageLoading.set(true);
    this.usage.set([]);
    this.api.usage(discount.id).subscribe({
      next: (usage) => { this.usage.set(usage); this.usageLoading.set(false); },
      error: () => { this.usageLoading.set(false); this.toast.show('Could not load discount usage.', 'error'); },
    });
  }

  private localDateTime(value: Date): string {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}
