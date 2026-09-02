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

const MIN_APPOINTMENT_BUFFER_MINUTES = 0;
const MAX_APPOINTMENT_BUFFER_MINUTES = 180;

@Component({
  selector: 'byiara-settings',
  imports: [
    ReactiveFormsModule,
    Alert,
    Button,
    Card,
    PageHeader,
    Skeleton,
  ],
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
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  protected loadSettings(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get().subscribe({
      next: (settings) => {
        this.form.reset(settings);
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
    this.api.update(this.form.getRawValue()).subscribe({
      next: (settings) => {
        this.form.reset(settings);
        this.saving.set(false);
        this.toast.show('Settings saved.', 'success');
      },
      error: (error: HttpErrorResponse) => {
        this.saveError.set(
          apiErrorMessage(error, 'Could not save settings. Please try again.'),
        );
        this.saving.set(false);
      },
    });
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
}
