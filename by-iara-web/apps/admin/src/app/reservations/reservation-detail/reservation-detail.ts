import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  ConfirmationModal,
  EmptyState,
  PageHeader,
  SelectField,
  SelectFieldOption,
  SelectableTile,
  Skeleton,
  StatusChip,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';
import { formatMoney } from '../../services/service.models';
import {
  CancellationReasonCode,
  PaymentMethod,
  PaymentSummary,
  ReservationPayment,
  RejectionReasonCode,
  ReservationResponse,
  reservationStatusLabel,
  reservationStatusTone,
} from '../reservation.models';
import { ReservationsApi } from '../reservations-api';

const reasonOptions: ReadonlyArray<SelectFieldOption> = [
  { label: 'Time no longer available', value: 'TIME_UNAVAILABLE' },
  { label: 'Service unavailable', value: 'SERVICE_UNAVAILABLE' },
  { label: 'Outside business hours', value: 'OUTSIDE_BUSINESS_HOURS' },
  { label: 'Unable to accommodate request', value: 'UNABLE_TO_ACCOMMODATE' },
  { label: 'Other', value: 'OTHER' },
];

const cancellationOptions: ReadonlyArray<SelectFieldOption> = [
  { label: 'Schedule change', value: 'SCHEDULE_CHANGE' },
  { label: 'Practitioner unavailable', value: 'PRACTITIONER_UNAVAILABLE' },
  { label: 'Business closure', value: 'BUSINESS_CLOSURE' },
  { label: 'Customer requested cancellation', value: 'CUSTOMER_REQUEST' },
  { label: 'Other', value: 'OTHER' },
];

const paymentMethodOptions: ReadonlyArray<SelectFieldOption> = [
  { label: 'Card', value: 'CARD' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
  { label: 'Other', value: 'OTHER' },
];

const discountTypeOptions: ReadonlyArray<SelectFieldOption> = [
  { label: 'Percentage', value: 'PERCENTAGE' },
  { label: 'Fixed euro amount', value: 'FIXED_AMOUNT' },
];

const defaultMessages: Record<'en' | 'pt', Record<RejectionReasonCode, string>> = {
  en: {
    TIME_UNAVAILABLE: 'Unfortunately, the requested time is no longer available. Please visit our website to choose another time.',
    SERVICE_UNAVAILABLE: 'Unfortunately, the requested service is not available at this time. Please contact us if you would like help choosing an alternative.',
    OUTSIDE_BUSINESS_HOURS: 'Unfortunately, the requested time falls outside our available business hours. Please visit our website to choose another time.',
    UNABLE_TO_ACCOMMODATE: 'Unfortunately, we are unable to accommodate this booking request. Please contact us if you would like help finding an alternative.',
    OTHER: '',
  },
  pt: {
    TIME_UNAVAILABLE: 'Infelizmente, o horário solicitado já não está disponível. Por favor visite o nosso site para escolher outro horário.',
    SERVICE_UNAVAILABLE: 'Infelizmente, o serviço solicitado não está disponível neste momento. Contacte-nos se desejar ajuda a escolher uma alternativa.',
    OUTSIDE_BUSINESS_HOURS: 'Infelizmente, o horário solicitado está fora do nosso horário disponível. Por favor visite o nosso site para escolher outro horário.',
    UNABLE_TO_ACCOMMODATE: 'Infelizmente, não conseguimos aceitar este pedido de reserva. Contacte-nos se desejar ajuda a encontrar uma alternativa.',
    OTHER: '',
  },
};

const cancellationMessages: Record<'en' | 'pt', Record<CancellationReasonCode, string>> = {
  en: {
    SCHEDULE_CHANGE: 'Unfortunately, we need to cancel your appointment because of a change to our schedule. Please contact us if you would like help booking another time.',
    PRACTITIONER_UNAVAILABLE: 'Unfortunately, your practitioner is no longer available for this appointment. Please contact us if you would like help booking another time.',
    BUSINESS_CLOSURE: 'Unfortunately, we will be closed at the time of your appointment and need to cancel it. Please contact us if you would like help booking another time.',
    CUSTOMER_REQUEST: 'Your appointment has been cancelled as requested.',
    OTHER: '',
  },
  pt: {
    SCHEDULE_CHANGE: 'Infelizmente, precisamos de cancelar a sua marcação devido a uma alteração no nosso horário. Contacte-nos se desejar ajuda a marcar outra data.',
    PRACTITIONER_UNAVAILABLE: 'Infelizmente, a profissional já não está disponível para esta marcação. Contacte-nos se desejar ajuda a marcar outra data.',
    BUSINESS_CLOSURE: 'Infelizmente, estaremos encerrados no horário da sua marcação e precisamos de a cancelar. Contacte-nos se desejar ajuda a marcar outra data.',
    CUSTOMER_REQUEST: 'A sua marcação foi cancelada conforme solicitado.',
    OTHER: '',
  },
};

@Component({
  selector: 'byiara-reservation-detail',
  imports: [
    ReactiveFormsModule,
    Alert,
    Button,
    Card,
    Checkbox,
    ConfirmationModal,
    EmptyState,
    PageHeader,
    SelectField,
    SelectableTile,
    Skeleton,
    StatusChip,
    TextField,
  ],
  templateUrl: './reservation-detail.html',
  styleUrl: './reservation-detail.css',
})
export class ReservationDetail implements OnInit {
  private readonly api = inject(ReservationsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private rescheduleSlotsRequestId = 0;

  protected readonly reservation = signal<ReservationResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly declineOpen = signal(false);
  protected readonly cancellationOpen = signal(false);
  protected readonly rescheduleOpen = signal(false);
  protected readonly rescheduleSlotsLoading = signal(false);
  protected readonly rescheduleSlotsError = signal<string | null>(null);
  protected readonly rescheduleSlotOptions = signal<ReadonlyArray<SelectFieldOption>>([]);
  protected readonly selectedRescheduleStart = signal('');
  protected readonly completionOpen = signal(false);
  protected readonly paymentOpen = signal(false);
  protected readonly paymentSummary = signal<PaymentSummary | null>(null);
  protected readonly payments = signal<ReservationPayment[]>([]);
  protected readonly selectedPaymentMethod = signal<PaymentMethod>('CARD');
  protected readonly selectedReason = signal<RejectionReasonCode>('TIME_UNAVAILABLE');
  protected readonly reasonOptions = reasonOptions;
  protected readonly cancellationOptions = cancellationOptions;
  protected readonly paymentMethodOptions = paymentMethodOptions;
  protected readonly discountTypeOptions = discountTypeOptions;
  protected readonly selectedDiscountType = signal<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  protected readonly selectedCancellationReason = signal<CancellationReasonCode>('SCHEDULE_CHANGE');
  protected readonly formatMoney = formatMoney;

  protected readonly declineForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });
  protected readonly cancellationForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });
  protected readonly rescheduleForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
  });
  protected readonly paymentForm = this.fb.nonNullable.group({
    recordPayment: [true],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]],
    reference: ['', [Validators.maxLength(255)]],
  });
  protected readonly completionDiscountForm = this.fb.nonNullable.group({
    includeDiscount: [true],
    value: ['10', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]],
    validityDays: ['30', [Validators.required, Validators.pattern(/^\d+$/)]],
    sameServiceOnly: [false],
  });

  @ViewChild('confirmAcceptModal')
  private confirmAcceptModal!: ConfirmationModal;

  @ViewChild('confirmNoShowModal')
  private confirmNoShowModal!: ConfirmationModal;

  ngOnInit(): void {
    this.rescheduleForm.controls.date.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.rescheduleOpen()) return;
        this.rescheduleSlotsError.set(null);
        this.rescheduleSlotOptions.set([]);
        this.selectedRescheduleStart.set('');
        this.loadRescheduleSlots();
      });
    this.load();
  }

  protected openAcceptConfirmation(): void {
    this.confirmAcceptModal.open();
  }

  protected confirmAccept(): void {
    const reservation = this.reservation();
    if (!reservation || this.submitting()) return;

    this.submitting.set(true);
    this.api.confirm(reservation.id).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.submitting.set(false);
        this.declineOpen.set(false);
        this.toast.show('Reservation accepted and customer notified.', 'success');
      },
      error: (error: HttpErrorResponse) => this.handleActionError(error, 'Could not accept the reservation.'),
    });
  }

  protected openDeclineForm(): void {
    const reservation = this.reservation();
    if (!reservation) return;

    this.declineOpen.set(true);
    this.setReason('TIME_UNAVAILABLE');
  }

  protected closeDeclineForm(): void {
    this.declineOpen.set(false);
    this.declineForm.reset({ message: '' });
  }

  protected setReason(value: string): void {
    if (!reasonOptions.some((option) => option.value === value)) return;

    const reason = value as RejectionReasonCode;
    const locale = this.reservation()?.locale === 'pt' ? 'pt' : 'en';
    this.selectedReason.set(reason);
    this.declineForm.controls.message.setValue(defaultMessages[locale][reason]);
  }

  protected submitDecline(): void {
    const reservation = this.reservation();
    if (!reservation || this.submitting()) return;
    if (this.declineForm.invalid) {
      this.declineForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.api.reject(reservation.id, {
      reasonCode: this.selectedReason(),
      message: this.declineForm.getRawValue().message.trim(),
    }).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.submitting.set(false);
        this.declineOpen.set(false);
        this.toast.show('Reservation declined and customer notified.', 'success');
      },
      error: (error: HttpErrorResponse) => this.handleActionError(error, 'Could not decline the reservation.'),
    });
  }

  protected openCancellationForm(): void {
    this.cancellationOpen.set(true);
    this.setCancellationReason('SCHEDULE_CHANGE');
  }

  protected closeCancellationForm(): void {
    this.cancellationOpen.set(false);
    this.cancellationForm.reset({ message: '' });
  }

  protected setCancellationReason(value: string): void {
    if (!cancellationOptions.some((option) => option.value === value)) return;
    const reason = value as CancellationReasonCode;
    const locale = this.reservation()?.locale === 'pt' ? 'pt' : 'en';
    this.selectedCancellationReason.set(reason);
    this.cancellationForm.controls.message.setValue(cancellationMessages[locale][reason]);
  }

  protected submitCancellation(): void {
    const reservation = this.reservation();
    if (!reservation || this.submitting()) return;
    if (this.cancellationForm.invalid) {
      this.cancellationForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.api.cancel(reservation.id, {
      reasonCode: this.selectedCancellationReason(),
      message: this.cancellationForm.getRawValue().message.trim(),
    }).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.submitting.set(false);
        this.cancellationOpen.set(false);
        this.toast.show('Reservation cancelled and customer notified.', 'success');
      },
      error: (error: HttpErrorResponse) => this.handleActionError(error, 'Could not cancel the reservation.'),
    });
  }

  protected openRescheduleForm(): void {
    const reservation = this.reservation();
    if (!reservation) return;

    this.declineOpen.set(false);
    this.cancellationOpen.set(false);
    this.completionOpen.set(false);
    this.paymentOpen.set(false);
    this.rescheduleOpen.set(true);
    this.rescheduleForm.controls.date.setValue(this.businessDateKey(reservation.startsAt));
  }

  protected closeRescheduleForm(): void {
    this.rescheduleSlotsRequestId += 1;
    this.rescheduleOpen.set(false);
    this.rescheduleSlotsError.set(null);
    this.rescheduleSlotOptions.set([]);
    this.selectedRescheduleStart.set('');
  }

  protected loadRescheduleSlots(): void {
    const reservation = this.reservation();
    if (!reservation || this.rescheduleForm.invalid) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }

    const requestId = ++this.rescheduleSlotsRequestId;
    this.rescheduleSlotsLoading.set(true);
    this.rescheduleSlotsError.set(null);
    this.rescheduleSlotOptions.set([]);
    this.selectedRescheduleStart.set('');
    const date = this.rescheduleForm.getRawValue().date;

    this.api.rescheduleAvailability(reservation.id, date).subscribe({
      next: (slots) => {
        if (requestId !== this.rescheduleSlotsRequestId) return;
        const options = slots
          .filter((startsAt) => new Date(startsAt).getTime() !== new Date(reservation.startsAt).getTime())
          .map((startsAt) => ({
            label: this.formatTime(startsAt),
            value: startsAt,
          }));
        this.rescheduleSlotOptions.set(options);
        this.selectedRescheduleStart.set(options[0]?.value ?? '');
        this.rescheduleSlotsLoading.set(false);
      },
      error: () => {
        if (requestId !== this.rescheduleSlotsRequestId) return;
        this.rescheduleSlotsError.set('Could not load available times for this date.');
        this.rescheduleSlotsLoading.set(false);
      },
    });
  }

  protected setRescheduleStart(value: string): void {
    if (this.rescheduleSlotOptions().some((option) => option.value === value)) {
      this.selectedRescheduleStart.set(value);
    }
  }

  protected submitReschedule(): void {
    const reservation = this.reservation();
    const startsAt = this.selectedRescheduleStart();
    if (!reservation || !startsAt || this.submitting()) return;

    this.submitting.set(true);
    this.api.reschedule(reservation.id, { startsAt }).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.rescheduleOpen.set(false);
        this.submitting.set(false);
        this.toast.show('Reservation rescheduled and customer notified.', 'success');
      },
      error: (error: HttpErrorResponse) => this.handleActionError(error, 'Could not reschedule the reservation.'),
    });
  }

  protected canCloseOut(): boolean {
    const reservation = this.reservation();
    return reservation?.status === 'CONFIRMED' && new Date(reservation.endsAt).getTime() <= Date.now();
  }

  protected canMarkNoShow(): boolean {
    const reservation = this.reservation();
    return reservation?.status === 'CONFIRMED' && new Date(reservation.startsAt).getTime() <= Date.now();
  }

  protected openCompletionForm(): void {
    this.completionOpen.set(true);
    this.paymentOpen.set(false);
    this.resetPaymentForm();
    this.paymentForm.controls.recordPayment.setValue((this.paymentSummary()?.balanceDueCents ?? 0) > 0);
    this.completionDiscountForm.reset({ includeDiscount: true, value: '10', validityDays: '30', sameServiceOnly: false });
    this.selectedDiscountType.set('PERCENTAGE');
  }

  protected closeCompletionForm(): void {
    this.completionOpen.set(false);
    this.paymentForm.reset({ recordPayment: true, amount: '', reference: '' });
    this.completionDiscountForm.reset({ includeDiscount: true, value: '10', validityDays: '30', sameServiceOnly: false });
  }

  protected completionRecordsPayment(): boolean {
    return this.paymentForm.controls.recordPayment.value;
  }

  protected completionIncludesDiscount(): boolean {
    return this.completionDiscountForm.controls.includeDiscount.value;
  }

  protected setDiscountType(value: string): void {
    if (value === 'PERCENTAGE' || value === 'FIXED_AMOUNT') this.selectedDiscountType.set(value);
  }

  protected openPaymentForm(): void {
    this.paymentOpen.set(true);
    this.completionOpen.set(false);
    this.resetPaymentForm();
  }

  protected closePaymentForm(): void {
    this.paymentOpen.set(false);
    this.paymentForm.reset({ recordPayment: true, amount: '', reference: '' });
  }

  protected setPaymentMethod(value: string): void {
    if (paymentMethodOptions.some((option) => option.value === value)) {
      this.selectedPaymentMethod.set(value as PaymentMethod);
    }
  }

  protected submitCompletion(): void {
    const reservation = this.reservation();
    if (!reservation || this.submitting()) return;
    if (this.completionRecordsPayment() && this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    if (this.completionIncludesDiscount() && this.completionDiscountForm.invalid) {
      this.completionDiscountForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const input = {
      ...(this.completionRecordsPayment() ? { payment: this.paymentInput(reservation) } : {}),
      ...(this.completionIncludesDiscount() ? { discount: this.completionDiscountInput() } : {}),
    };
    this.api.complete(reservation.id, input).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.completionOpen.set(false);
        this.submitting.set(false);
        this.reloadPayments();
        this.toast.show(
          this.completionIncludesDiscount()
            ? 'Reservation completed. The thank-you email includes the review link and personal discount.'
            : 'Reservation completed and thank-you email sent.',
          'success',
        );
      },
      error: (error: HttpErrorResponse) => this.handleActionError(error, 'Could not complete the reservation.'),
    });
  }

  private completionDiscountInput() {
    const form = this.completionDiscountForm.getRawValue();
    return {
      valueType: this.selectedDiscountType(),
      valueAmount: Math.round(Number(form.value.replace(',', '.')) * 100),
      validityDays: Number(form.validityDays),
      sameServiceOnly: form.sameServiceOnly,
    };
  }

  protected openNoShowConfirmation(): void {
    this.confirmNoShowModal.open();
  }

  protected confirmNoShow(): void {
    const reservation = this.reservation();
    if (!reservation || this.submitting()) return;
    this.submitting.set(true);
    this.api.markNoShow(reservation.id).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.submitting.set(false);
        this.toast.show('Reservation marked as no-show.', 'success');
      },
      error: (error: HttpErrorResponse) => this.handleActionError(error, 'Could not mark the reservation as no-show.'),
    });
  }

  protected submitPayment(): void {
    const reservation = this.reservation();
    if (!reservation || this.submitting()) return;
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.api.recordPayment(reservation.id, this.paymentInput(reservation)).subscribe({
      next: () => {
        this.paymentOpen.set(false);
        this.submitting.set(false);
        this.reloadPayments();
        this.toast.show('Payment recorded.', 'success');
      },
      error: (error: HttpErrorResponse) => this.handleActionError(error, 'Could not record the payment.'),
    });
  }

  protected formatPaymentAmount(amountCents: number, currency: string): string {
    return formatMoney({ amountCents, currency });
  }

  protected paymentStateLabel(): string {
    switch (this.paymentSummary()?.state) {
      case 'PAID': return 'Paid';
      case 'PARTIALLY_PAID': return 'Partially paid';
      default: return 'Unpaid';
    }
  }

  protected paymentMethodLabel(method: PaymentMethod): string {
    return paymentMethodOptions.find((option) => option.value === method)?.label ?? 'Other';
  }

  protected statusLabel(): string {
    return reservationStatusLabel(this.reservation()?.status ?? 'PENDING');
  }

  protected statusTone() {
    return reservationStatusTone(this.reservation()?.status ?? 'PENDING');
  }

  protected reasonLabel(code: RejectionReasonCode | null | undefined): string {
    return reasonOptions.find((option) => option.value === code)?.label ?? 'Other';
  }

  protected cancellationReasonLabel(code: CancellationReasonCode | null | undefined): string {
    return cancellationOptions.find((option) => option.value === code)?.label ?? 'Other';
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/Brussels',
    }).format(new Date(value));
  }

  private formatTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Brussels',
    }).format(new Date(value));
  }

  private businessDateKey(value: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Europe/Brussels',
    }).formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('Reservation not found.');
      return;
    }

    forkJoin({ reservation: this.api.get(id), payments: this.api.payments(id) }).subscribe({
      next: ({ reservation, payments }) => {
        this.reservation.set(reservation);
        this.paymentSummary.set(payments.summary);
        this.payments.set(payments.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load this reservation.');
      },
    });
  }

  private resetPaymentForm(): void {
    const balance = this.paymentSummary()?.balanceDueCents ?? this.reservation()?.price.amountCents ?? 0;
    this.selectedPaymentMethod.set('CARD');
    this.paymentForm.reset({ recordPayment: true, amount: (balance / 100).toFixed(2), reference: '' });
  }

  private paymentInput(reservation: ReservationResponse) {
    const form = this.paymentForm.getRawValue();
    return {
      amountCents: Math.round(Number(form.amount.replace(',', '.')) * 100),
      currency: reservation.price.currency,
      method: this.selectedPaymentMethod(),
      reference: form.reference.trim() || undefined,
    };
  }

  private reloadPayments(): void {
    const id = this.reservation()?.id;
    if (!id) return;
    this.api.payments(id).subscribe({
      next: (payments) => {
        this.paymentSummary.set(payments.summary);
        this.payments.set(payments.items);
      },
      error: () => this.error.set('Reservation updated, but payment details could not be refreshed.'),
    });
  }

  private handleActionError(error: HttpErrorResponse, fallback: string): void {
    this.submitting.set(false);
    const serverMessage = typeof error.error?.message === 'string' ? error.error.message : null;
    const message = serverMessage ?? (
      error.status === 409
        ? 'This reservation was already updated. Refresh the page to see its latest status.'
        : fallback
    );
    this.error.set(message);
    this.toast.show(message, 'error');
  }
}
