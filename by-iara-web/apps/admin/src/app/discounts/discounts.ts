import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Alert,
  Button,
  Checkbox,
  ConfirmationModal,
  EmptyState,
  PageHeader,
  SelectField,
  SelectFieldOption,
  StatusChip,
  Stepper,
  TextField,
  ToastService,
  touchedError,
} from '@by-iara/shared-ui';
import type { StepperStep } from '@by-iara/shared-ui';
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

const scopeOptions: SelectFieldOption[] = [
  { label: 'Any individual service', value: 'ALL_SERVICES' },
  { label: 'Selected services', value: 'SELECTED_SERVICES' },
];
const valueTypeOptions: SelectFieldOption[] = [
  { label: 'Percentage', value: 'PERCENTAGE' },
  { label: 'Fixed euro amount', value: 'FIXED_AMOUNT' },
];

const discountDateRangeValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const startsAt = control.get('startsAt')?.value;
  const endsAt = control.get('endsAt')?.value;
  if (!startsAt || !endsAt) return null;

  return new Date(startsAt) < new Date(endsAt) ? null : { dateRange: true };
};

@Component({
  selector: 'byiara-discounts',
  imports: [
    Alert,
    Button,
    Checkbox,
    ConfirmationModal,
    EmptyState,
    PageHeader,
    ReactiveFormsModule,
    RouterLink,
    SelectField,
    StatusChip,
    Stepper,
    TextField,
  ],
  templateUrl: './discounts.html',
  styleUrl: './discounts.css',
})
export class Discounts implements OnInit {
  protected readonly touchedError = touchedError;
  @ViewChild('detailsDialog')
  private detailsDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('deleteConfirmation')
  private deleteConfirmation?: ConfirmationModal;
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
  protected readonly currentStep = signal<
    'kind' | 'offer' | 'schedule' | 'review'
  >('kind');
  protected readonly furthestStep = signal(0);

  protected readonly scopeOptions = scopeOptions;
  protected readonly valueTypeOptions = valueTypeOptions;
  protected readonly steps = computed<StepperStep[]>(() => [
    { id: 'kind', label: 'Type' },
    { id: 'offer', label: 'Offer', disabled: this.furthestStep() < 1 },
    { id: 'schedule', label: 'Schedule', disabled: this.furthestStep() < 2 },
    { id: 'review', label: 'Review', disabled: this.furthestStep() < 3 },
  ]);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(160)]],
      code: ['', Validators.maxLength(100)],
      customerEmail: ['', Validators.email],
      value: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/),
          Validators.min(0.01),
          Validators.max(100),
        ],
      ],
      startsAt: ['', Validators.required],
      endsAt: ['', Validators.required],
      maxClients: ['', Validators.pattern(/^[1-9]\d*$/)],
      maxUsesPerCustomer: [
        '1',
        [Validators.required, Validators.pattern(/^[1-9]\d*$/)],
      ],
      sendEmail: [true],
      featured: [false],
    },
    { validators: discountDateRangeValidator },
  );

  protected readonly activeCount = computed(
    () =>
      this.discounts().filter(
        (discount) => this.displayStatus(discount) === 'Active',
      ).length,
  );

  ngOnInit(): void {
    this.load();
    this.servicesApi
      .list({ active: true })
      .subscribe({ next: (services) => this.services.set(services) });
  }

  protected openForm(): void {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 86_400_000);
    this.form.reset({
      name: '',
      code: '',
      customerEmail: '',
      value: '',
      startsAt: this.localDateTime(now),
      endsAt: this.localDateTime(end),
      maxClients: '',
      maxUsesPerCustomer: '1',
      sendEmail: true,
      featured: false,
    });
    this.audience.set('PUBLIC');
    this.scope.set('ALL_SERVICES');
    this.valueType.set('PERCENTAGE');
    this.selectedServiceIds.set(new Set());
    this.generatedCode.set(null);
    this.error.set(null);
    this.currentStep.set('kind');
    this.furthestStep.set(0);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  protected setAudience(value: string): void {
    if (value !== 'PUBLIC' && value !== 'PERSONAL' && value !== 'AUTOMATIC')
      return;
    this.audience.set(value);
    if (value === 'AUTOMATIC') {
      this.scope.set('SELECTED_SERVICES');
      this.form.patchValue({
        featured: false,
        sendEmail: false,
        code: '',
        customerEmail: '',
        maxClients: '',
      });
    }
  }

  protected setScope(value: string): void {
    if (this.audience() === 'AUTOMATIC') return;
    if (value === 'ALL_SERVICES' || value === 'SELECTED_SERVICES')
      this.scope.set(value);
  }

  protected setValueType(value: string): void {
    if (value === 'PERCENTAGE' || value === 'FIXED_AMOUNT') {
      this.valueType.set(value);
      const validators = [
        Validators.required,
        Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/),
        Validators.min(0.01),
      ];
      if (value === 'PERCENTAGE') validators.push(Validators.max(100));
      this.form.controls.value.setValidators(validators);
      this.form.controls.value.updateValueAndValidity();
    }
  }

  protected customerEmailError(): string | null {
    const control = this.form.controls.customerEmail;
    if (this.audience() !== 'PERSONAL' || !control.touched) return null;
    if (!control.value.trim()) return 'Enter the customer email.';
    return control.invalid ? 'Enter a valid customer email.' : null;
  }

  protected discountValueError(): string | null {
    const control = this.form.controls.value;
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return 'Enter a discount value.';
    if (control.hasError('max')) return 'Percentage cannot exceed 100%.';
    return 'Enter an amount greater than zero with up to two decimals.';
  }

  protected scheduleEndError(): string | null {
    const control = this.form.controls.endsAt;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Choose an end date.';
    return this.form.hasError('dateRange')
      ? 'End date must be after the start date.'
      : null;
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

  protected toggleServiceSelection(serviceId: string): void {
    this.toggleService(serviceId, !this.selectedServiceIds().has(serviceId));
  }

  protected goToStep(step: string): void {
    if (
      step === 'kind' ||
      step === 'offer' ||
      step === 'schedule' ||
      step === 'review'
    ) {
      this.currentStep.set(step);
    }
  }

  protected nextStep(): void {
    const order = ['kind', 'offer', 'schedule', 'review'] as const;
    const index = order.indexOf(this.currentStep());
    if (!this.validateStep(this.currentStep()) || index >= order.length - 1)
      return;
    this.furthestStep.update((current) => Math.max(current, index + 1));
    this.currentStep.set(order[index + 1]);
    this.error.set(null);
  }

  protected previousStep(): void {
    const order = ['kind', 'offer', 'schedule', 'review'] as const;
    const index = order.indexOf(this.currentStep());
    if (index > 0) this.currentStep.set(order[index - 1]);
    this.error.set(null);
  }

  protected submit(): void {
    const raw = this.form.getRawValue();
    if (
      this.form.invalid ||
      this.submitting() ||
      (this.audience() === 'PERSONAL' && !raw.customerEmail.trim()) ||
      (this.scope() === 'SELECTED_SERVICES' &&
        this.selectedServiceIds().size === 0)
    ) {
      this.form.markAllAsTouched();
      this.error.set('Complete the required discount details.');
      return;
    }
    const numericValue = Number(raw.value.replace(',', '.'));
    const valueAmount =
      this.valueType() === 'PERCENTAGE'
        ? Math.round(numericValue * 100)
        : Math.round(numericValue * 100);
    this.submitting.set(true);
    this.error.set(null);
    this.api
      .create({
        name: raw.name.trim(),
        audience: this.audience(),
        scope: this.scope(),
        valueType: this.valueType(),
        valueAmount,
        currency: this.valueType() === 'FIXED_AMOUNT' ? 'EUR' : undefined,
        startsAt: new Date(raw.startsAt).toISOString(),
        endsAt: new Date(raw.endsAt).toISOString(),
        maxUniqueClients:
          this.audience() === 'AUTOMATIC'
            ? undefined
            : raw.maxClients
              ? Number(raw.maxClients)
              : undefined,
        maxUsesPerCustomer: Number(raw.maxUsesPerCustomer),
        serviceIds: [...this.selectedServiceIds()],
        customerEmail:
          this.audience() === 'PERSONAL' ? raw.customerEmail.trim() : undefined,
        code:
          this.audience() === 'PUBLIC'
            ? raw.code.trim() || undefined
            : undefined,
        sendEmail: this.audience() === 'PERSONAL' && raw.sendEmail,
        featured: this.audience() === 'PUBLIC' && raw.featured,
      })
      .subscribe({
        next: ({ discount, generatedCode, deliveryStatus }) => {
          this.submitting.set(false);
          this.generatedCode.set(generatedCode);
          this.discounts.update((items) => [discount, ...items]);
          this.selectedDiscount.set(discount);
          this.loadUsage(discount);
          if (!generatedCode) this.formOpen.set(false);
          if (deliveryStatus === 'FAILED') {
            this.toast.show(
              'Discount created, but the email could not be sent. Check email logs and copy the code.',
              'error',
            );
          } else if (deliveryStatus === 'SENT') {
            this.toast.show(
              'Discount created and emailed to the customer.',
              'success',
            );
          } else {
            this.toast.show('Discount created.', 'success');
          }
        },
        error: (response: HttpErrorResponse) => {
          this.submitting.set(false);
          this.error.set(
            response.error?.message || 'Could not create the discount.',
          );
        },
      });
  }

  protected select(discount: Discount): void {
    this.selectedDiscount.set(discount);
    this.loadUsage(discount);
    this.detailsDialog?.nativeElement.showModal();
  }

  protected closeDetails(): void {
    this.detailsDialog?.nativeElement.close();
  }

  protected onDetailsClosed(): void {
    this.selectedDiscount.set(null);
    this.usage.set([]);
  }

  protected onDrawerBackdrop(event: MouseEvent): void {
    if (event.target === this.detailsDialog?.nativeElement) this.closeDetails();
  }

  protected updateStatus(discount: Discount, status: DiscountStatus): void {
    this.api.updateStatus(discount.id, status).subscribe({
      next: (updated) => {
        this.discounts.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.selectedDiscount.set(updated);
        this.toast.show(`Discount ${status.toLowerCase()}.`, 'success');
      },
      error: () => this.toast.show('Could not update the discount.', 'error'),
    });
  }

  protected updateFeatured(discount: Discount, featured: boolean): void {
    this.api.updateFeatured(discount.id, featured).subscribe({
      next: (updated) => {
        this.discounts.update((items) =>
          items.map((item) => ({
            ...item,
            featured: item.id === updated.id ? updated.featured : false,
          })),
        );
        this.selectedDiscount.set(updated);
        this.toast.show(
          featured
            ? 'Discount featured on the website.'
            : 'Discount removed from the website.',
          'success',
        );
      },
      error: (response: HttpErrorResponse) =>
        this.toast.show(
          response.error?.message || 'Could not update the featured discount.',
          'error',
        ),
    });
  }

  protected confirmDelete(): void {
    this.deleteConfirmation?.open();
  }

  protected deleteSelected(): void {
    const discount = this.selectedDiscount();
    if (!discount) return;
    this.api.delete(discount.id).subscribe({
      next: () => {
        this.discounts.update((items) =>
          items.filter((item) => item.id !== discount.id),
        );
        this.closeDetails();
        this.toast.show('Discount permanently deleted.', 'success');
      },
      error: (response: HttpErrorResponse) =>
        this.toast.show(
          response.error?.message ||
            'Could not delete the discount. Archive it instead.',
          'error',
        ),
    });
  }

  protected benefit(discount: Discount): string {
    return discount.valueType === 'PERCENTAGE'
      ? `${discount.valueAmount / 100}%`
      : this.money(discount.valueAmount, discount.currency || 'EUR');
  }

  protected serviceScope(discount: Discount): string {
    if (discount.scope === 'ALL_SERVICES') return 'All services';
    const names = this.services()
      .filter((service) => discount.serviceIds.includes(service.id))
      .map((service) => service.name);
    return names.length
      ? names.join(', ')
      : `${discount.serviceIds.length} selected services`;
  }

  protected applicationLabel(discount: Discount): string {
    if (discount.audience === 'AUTOMATIC') return 'Automatic promotion';
    return discount.audience === 'PERSONAL' ? 'Personal code' : 'Public code';
  }

  protected selectedServicesLabel(): string {
    const names = this.services()
      .filter((service) => this.selectedServiceIds().has(service.id))
      .map((service) => service.name);
    return names.join(', ');
  }

  protected displayStatus(discount: Discount): string {
    if (discount.status !== 'ACTIVE')
      return discount.status === 'PAUSED' ? 'Paused' : 'Archived';
    const now = Date.now();
    if (new Date(discount.startsAt).getTime() > now) return 'Scheduled';
    if (new Date(discount.endsAt).getTime() <= now) return 'Expired';
    return 'Active';
  }

  protected statusTone(discount: Discount): 'success' | 'warning' | 'muted' {
    const status = this.displayStatus(discount);
    return status === 'Active'
      ? 'success'
      : status === 'Scheduled' || status === 'Paused'
        ? 'warning'
        : 'muted';
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
      new Date(value),
    );
  }

  protected money(cents: number, currency: string): string {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  }

  private load(): void {
    this.api.list().subscribe({
      next: (discounts) => {
        this.discounts.set(discounts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load discounts.');
      },
    });
  }

  private loadUsage(discount: Discount): void {
    this.usageLoading.set(true);
    this.usage.set([]);
    this.api.usage(discount.id).subscribe({
      next: (usage) => {
        this.usage.set(usage);
        this.usageLoading.set(false);
      },
      error: () => {
        this.usageLoading.set(false);
        this.toast.show('Could not load discount usage.', 'error');
      },
    });
  }

  private validateStep(
    step: 'kind' | 'offer' | 'schedule' | 'review',
  ): boolean {
    if (step === 'kind') {
      this.form.controls.name.markAsTouched();
      if (this.form.controls.name.invalid) {
        this.error.set('Give the discount an internal name.');
        return false;
      }
    }
    if (step === 'offer') {
      this.form.controls.value.markAsTouched();
      if (
        this.form.controls.value.invalid ||
        (this.scope() === 'SELECTED_SERVICES' &&
          this.selectedServiceIds().size === 0)
      ) {
        this.error.set(
          'Set a valid benefit and choose at least one eligible service.',
        );
        return false;
      }
    }
    if (step === 'schedule') {
      this.form.controls.startsAt.markAsTouched();
      this.form.controls.endsAt.markAsTouched();
      if (
        this.form.controls.startsAt.invalid ||
        this.form.controls.endsAt.invalid ||
        new Date(this.form.controls.startsAt.value) >=
          new Date(this.form.controls.endsAt.value)
      ) {
        this.error.set('Choose a valid start and end date.');
        return false;
      }
      if (this.audience() === 'PERSONAL') {
        this.form.controls.customerEmail.markAsTouched();
        if (
          !this.form.controls.customerEmail.value.trim() ||
          this.form.controls.customerEmail.invalid
        ) {
          this.error.set(
            'Enter the customer email for this personal discount.',
          );
          return false;
        }
      }
    }
    return true;
  }

  private localDateTime(value: Date): string {
    const local = new Date(
      value.getTime() - value.getTimezoneOffset() * 60_000,
    );
    return local.toISOString().slice(0, 16);
  }
}
