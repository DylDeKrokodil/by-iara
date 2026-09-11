import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Alert,
  Button,
  Card,
  PageHeader,
  Skeleton,
  ToastService,
} from '@by-iara/shared-ui';
import { apiErrorMessage } from '../core/api-error-message';
import { SettingsApi } from './settings-api';
import { OperationalSettings } from './settings.models';

const MIN_APPOINTMENT_BUFFER_MINUTES = 0;
const MAX_APPOINTMENT_BUFFER_MINUTES = 180;
const DEFAULT_MAX_DAILY_BOOKINGS = 3;
const MIN_BOOKING_NOTICE_HOURS = 0;
const MAX_BOOKING_NOTICE_HOURS = 8760;
const DEFAULT_MINIMUM_BOOKING_NOTICE_HOURS = 0;
const MIN_BOOKING_REMINDER_HOURS = 1;
const MAX_BOOKING_REMINDER_HOURS = 168;
const DEFAULT_BOOKING_REMINDER_HOURS = 24;

@Component({
  selector: 'byiara-settings',
  imports: [ReactiveFormsModule, Alert, Button, Card, PageHeader, Skeleton],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SettingsApi);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    appointmentBufferMinutes: [
      15,
      [
        Validators.required,
        Validators.min(MIN_APPOINTMENT_BUFFER_MINUTES),
        Validators.max(MAX_APPOINTMENT_BUFFER_MINUTES),
        Validators.pattern(/^\d*[05]$/),
      ],
    ],
    maxDailyBookings: [
      DEFAULT_MAX_DAILY_BOOKINGS,
      [Validators.required, Validators.min(1)],
    ],
    noDailyBookingLimit: false,
    minimumBookingNoticeHours: [
      DEFAULT_MINIMUM_BOOKING_NOTICE_HOURS,
      [
        Validators.required,
        Validators.min(MIN_BOOKING_NOTICE_HOURS),
        Validators.max(MAX_BOOKING_NOTICE_HOURS),
        Validators.pattern(/^\d+$/),
      ],
    ],
    bookingReminderEnabled: false,
    bookingReminderHoursBefore: [
      DEFAULT_BOOKING_REMINDER_HOURS,
      [
        Validators.required,
        Validators.min(MIN_BOOKING_REMINDER_HOURS),
        Validators.max(MAX_BOOKING_REMINDER_HOURS),
        Validators.pattern(/^\d+$/),
      ],
    ],
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  protected loadSettings(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get().subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load settings. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    this.saveError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    this.api
      .update({
        appointmentBufferMinutes: value.appointmentBufferMinutes,
        maxDailyBookings: value.noDailyBookingLimit
          ? null
          : value.maxDailyBookings,
        minimumBookingNoticeHours: value.minimumBookingNoticeHours,
        bookingReminderEnabled: value.bookingReminderEnabled,
        bookingReminderHoursBefore: value.bookingReminderHoursBefore,
      })
      .subscribe({
        next: (settings) => {
          this.applySettings(settings);
          this.saving.set(false);
          this.toast.show('Settings saved.', 'success');
        },
        error: (error: HttpErrorResponse) => {
          this.saveError.set(
            apiErrorMessage(
              error,
              'Could not save settings. Please try again.',
            ),
          );
          this.saving.set(false);
        },
      });
  }

  protected dailyLimitChanged(noLimit: boolean): void {
    const control = this.form.controls.maxDailyBookings;
    if (noLimit) {
      control.disable();
    } else {
      control.enable();
    }
  }

  protected reminderEnabledChanged(enabled: boolean): void {
    const control = this.form.controls.bookingReminderHoursBefore;
    if (enabled) {
      control.enable();
    } else {
      control.disable();
    }
  }

  protected appointmentBufferError(): string | null {
    const control = this.form.controls.appointmentBufferMinutes;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Enter the time needed between appointments.';
    }
    return `Enter a value from ${MIN_APPOINTMENT_BUFFER_MINUTES} to ${MAX_APPOINTMENT_BUFFER_MINUTES} in 5-minute increments.`;
  }

  protected dailyBookingLimitError(): string | null {
    const control = this.form.controls.maxDailyBookings;
    if (!control.touched || control.valid || control.disabled) {
      return null;
    }
    return 'Enter at least 1 booking per day, or choose no limit.';
  }

  protected bookingReminderHoursError(): string | null {
    const control = this.form.controls.bookingReminderHoursBefore;
    if (!control.touched || control.valid || control.disabled) {
      return null;
    }
    return `Enter a whole number from ${MIN_BOOKING_REMINDER_HOURS} to ${MAX_BOOKING_REMINDER_HOURS} hours.`;
  }

  protected minimumBookingNoticeHoursError(): string | null {
    const control = this.form.controls.minimumBookingNoticeHours;
    if (!control.touched || control.valid) {
      return null;
    }
    return `Enter a whole number from ${MIN_BOOKING_NOTICE_HOURS} to ${MAX_BOOKING_NOTICE_HOURS} hours.`;
  }

  private applySettings(settings: OperationalSettings): void {
    const noDailyBookingLimit = settings.maxDailyBookings === null;
    const bookingReminderEnabled = settings.bookingReminderEnabled ?? false;
    this.form.reset({
      appointmentBufferMinutes: settings.appointmentBufferMinutes,
      maxDailyBookings: settings.maxDailyBookings ?? DEFAULT_MAX_DAILY_BOOKINGS,
      noDailyBookingLimit,
      minimumBookingNoticeHours:
        settings.minimumBookingNoticeHours ??
        DEFAULT_MINIMUM_BOOKING_NOTICE_HOURS,
      bookingReminderEnabled,
      bookingReminderHoursBefore:
        settings.bookingReminderHoursBefore ?? DEFAULT_BOOKING_REMINDER_HOURS,
    });
    this.dailyLimitChanged(noDailyBookingLimit);
    this.reminderEnabledChanged(bookingReminderEnabled);
    this.form.markAsPristine();
  }
}
