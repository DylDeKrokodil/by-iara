import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { BUSINESS_TIME_ZONE } from '@by-iara/config';
import { Alert, Button, Card, PageHeader, ToastService } from '@by-iara/shared-ui';
import { ServicesApi } from '../../services/services-api';
import { Service } from '../../services/service.models';
import { ReservationsApi } from '../reservations-api';

@Component({
  selector: 'byiara-admin-reservation-form',
  imports: [ReactiveFormsModule, DecimalPipe, Alert, Button, Card, PageHeader],
  templateUrl: './admin-reservation-form.html',
  styleUrl: './admin-reservation-form.css',
})
export class AdminReservationForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicesApi = inject(ServicesApi);
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    serviceId: ['', Validators.required],
    serviceVariantId: ['', Validators.required],
    date: [this.todayKey(), Validators.required],
    time: ['10:00', Validators.required],
    name: ['', Validators.maxLength(160)],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    phone: ['', Validators.maxLength(40)],
    price: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]],
    tip: ['0', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]],
    notes: ['', Validators.maxLength(1000)],
  });

  ngOnInit(): void {
    this.servicesApi.list({ active: true }).subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
        const first = services[0];
        const variant = first?.variants.find((item) => item.active);
        if (first && variant) {
          this.form.patchValue({
            serviceId: first.id,
            serviceVariantId: variant.id,
            price: this.euros(variant.price.amountCents),
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load services.');
      },
    });
  }

  protected selectedService(): Service | undefined {
    return this.services().find((service) => service.id === this.form.controls.serviceId.value);
  }

  protected variants(): Service['variants'] {
    return this.selectedService()?.variants.filter((variant) => variant.active) ?? [];
  }

  protected onServiceChange(): void {
    const variant = this.variants()[0];
    this.form.patchValue({
      serviceVariantId: variant?.id ?? '',
      price: variant ? this.euros(variant.price.amountCents) : '',
    });
  }

  protected onVariantChange(): void {
    const variant = this.variants().find((item) => item.id === this.form.controls.serviceVariantId.value);
    if (variant) this.form.controls.price.setValue(this.euros(variant.price.amountCents));
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.reservationsApi.createAdmin({
      serviceId: value.serviceId,
      serviceVariantId: value.serviceVariantId,
      startsAt: this.businessDateTime(value.date, value.time),
      customer: this.customerInput(value.name, value.email, value.phone),
      notes: value.notes.trim() || undefined,
      priceCents: this.cents(value.price),
      tipCents: this.cents(value.tip),
    }).subscribe({
      next: (reservation) => {
        this.toast.show(
          reservation.status === 'COMPLETED'
            ? 'Historical reservation added.'
            : 'Reservation created and confirmed.',
          'success',
        );
        this.router.navigate(['/reservations', reservation.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(typeof error.error?.message === 'string' ? error.error.message : 'Could not create the reservation.');
      },
    });
  }

  protected cancel(): void {
    this.router.navigateByUrl('/reservations');
  }

  private cents(value: string): number { return Math.round(Number(value.replace(',', '.')) * 100); }
  private euros(cents: number): string { return (cents / 100).toFixed(2); }
  private customerInput(name: string, email: string, phone: string) {
    const customer = {
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    };
    return customer.name || customer.email || customer.phone ? customer : undefined;
  }
  private businessDateTime(date: string, time: string): string {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const localTimestamp = Date.UTC(year, month - 1, day, hour, minute);
    const offsetAt = (timestamp: number): number => {
      const offset = new Intl.DateTimeFormat('en-US', {
        timeZone: BUSINESS_TIME_ZONE,
        timeZoneName: 'longOffset',
      }).formatToParts(new Date(timestamp)).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
      const match = offset.match(/^GMT([+-])(\d{2}):(\d{2})$/);
      if (!match) return 0;
      const minutes = Number(match[2]) * 60 + Number(match[3]);
      return match[1] === '+' ? minutes : -minutes;
    };
    let utcTimestamp = localTimestamp - offsetAt(localTimestamp) * 60_000;
    utcTimestamp = localTimestamp - offsetAt(utcTimestamp) * 60_000;
    return new Date(utcTimestamp).toISOString();
  }
  private todayKey(): string {
    const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: BUSINESS_TIME_ZONE }).formatToParts(new Date());
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
}
