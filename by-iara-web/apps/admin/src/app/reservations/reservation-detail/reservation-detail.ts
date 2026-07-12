import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  Alert,
  Button,
  Card,
  ConfirmationModal,
  EmptyState,
  PageHeader,
  SelectField,
  SelectFieldOption,
  StatusChip,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';
import { formatMoney } from '../../services/service.models';
import {
  CancellationReasonCode,
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
    ConfirmationModal,
    EmptyState,
    PageHeader,
    SelectField,
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

  protected readonly reservation = signal<ReservationResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly declineOpen = signal(false);
  protected readonly cancellationOpen = signal(false);
  protected readonly selectedReason = signal<RejectionReasonCode>('TIME_UNAVAILABLE');
  protected readonly reasonOptions = reasonOptions;
  protected readonly cancellationOptions = cancellationOptions;
  protected readonly selectedCancellationReason = signal<CancellationReasonCode>('SCHEDULE_CHANGE');
  protected readonly formatMoney = formatMoney;

  protected readonly declineForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });
  protected readonly cancellationForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  @ViewChild('confirmAcceptModal')
  private confirmAcceptModal!: ConfirmationModal;

  ngOnInit(): void {
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

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('Reservation not found.');
      return;
    }

    this.api.get(id).subscribe({
      next: (reservation) => {
        this.reservation.set(reservation);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load this reservation.');
      },
    });
  }

  private handleActionError(error: HttpErrorResponse, fallback: string): void {
    this.submitting.set(false);
    const message = error.status === 409 || error.status === 422
      ? 'This reservation was already updated. Refresh the page to see its latest status.'
      : fallback;
    this.error.set(message);
    this.toast.show(message, 'error');
  }
}
