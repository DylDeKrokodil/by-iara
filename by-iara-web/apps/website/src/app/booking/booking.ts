import {
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ChoiceChip,
  SelectField,
  SelectFieldOption,
  Stepper,
  TextField,
} from '@by-iara/shared-ui';
import {
  Service,
  ServicesApi,
  ServiceVariant,
  localizedService,
} from '../services/services-api';
import { LanguageService } from '../i18n/language.service';
import { BookingApi, ReservationConfirmation } from './booking-api';

// The catalog/slots are computed in the business timezone, so display them there
// too, regardless of the visitor's browser timezone.
const BUSINESS_TIMEZONE = 'Europe/Brussels';
const BOOKING_WINDOW_DAYS = 28;

type BookingStep = 'service' | 'time' | 'details' | 'review';
const BOOKING_STEPS: readonly BookingStep[] = ['service', 'time', 'details', 'review'];

interface SlotView {
  readonly iso: string;
  readonly time: string;
  readonly hour: number;
}

type SlotPeriod = 'morning' | 'afternoon' | 'evening';

interface SlotGroup {
  readonly period: SlotPeriod;
  readonly label: string;
  readonly slots: ReadonlyArray<SlotView>;
}

interface DateSlots {
  readonly key: string;
  readonly weekday: string;
  readonly day: string;
  readonly month: string;
  readonly label: string;
  readonly slots: ReadonlyArray<SlotView>;
}

@Component({
  selector: 'byiara-booking',
  imports: [ReactiveFormsModule, RouterLink, SelectField, ChoiceChip, Stepper, TextField],
  templateUrl: './booking.html',
  styleUrl: './booking.css',
})
export class Booking implements OnInit {
  private readonly api = inject(ServicesApi);
  private readonly bookingApi = inject(BookingApi);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  protected readonly language = inject(LanguageService);

  protected readonly copy = computed(() => this.language.messages().booking);

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly services = signal<Service[]>([]);

  protected readonly selectedServiceId = signal<string | null>(null);
  protected readonly selectedVariantId = signal<string | null>(null);
  protected readonly slots = signal<string[]>([]);
  protected readonly slotsLoading = signal(false);
  protected readonly slotsError = signal(false);
  protected readonly selectedDateKey = signal<string | null>(null);
  protected readonly selectedSlot = signal<string | null>(null);
  protected readonly currentStep = signal<BookingStep>('service');
  protected readonly stepDirection = signal<'forward' | 'backward'>('forward');

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly confirmation = signal<ReservationConfirmation | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    notes: [''],
  });

  protected readonly serviceOptions = computed<SelectFieldOption[]>(() =>
    this.services().map((service) => ({
      label: this.localizedName(service),
      value: service.id,
    })),
  );

  protected readonly selectedService = computed(
    () => this.services().find((s) => s.id === this.selectedServiceId()) ?? null,
  );

  protected readonly serviceTitle = computed(() => {
    const service = this.selectedService();
    return service ? this.localizedName(service) : '';
  });

  protected readonly activeVariants = computed(() =>
    [...(this.selectedService()?.variants ?? [])]
      .filter((variant) => variant.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  protected readonly selectedVariant = computed(
    () => this.activeVariants().find((v) => v.id === this.selectedVariantId()) ?? null,
  );

  protected readonly availableDates = computed(() => this.groupByDate(this.slots()));

  protected readonly selectedDateSlots = computed(() => {
    const selectedDateKey = this.selectedDateKey();
    if (!selectedDateKey) {
      return [];
    }

    return this.availableDates().find((date) => date.key === selectedDateKey)?.slots ?? [];
  });

  // Group the day's slots into morning / afternoon / evening, dropping any
  // empty period so a quiet day never shows a hollow section.
  protected readonly selectedDateSlotGroups = computed<SlotGroup[]>(() => {
    const copy = this.copy();
    const buckets: Record<SlotPeriod, SlotView[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const slot of this.selectedDateSlots()) {
      const period: SlotPeriod =
        slot.hour < 12 ? 'morning' : slot.hour < 17 ? 'afternoon' : 'evening';
      buckets[period].push(slot);
    }
    const labels: Record<SlotPeriod, string> = {
      morning: copy.periodMorning,
      afternoon: copy.periodAfternoon,
      evening: copy.periodEvening,
    };
    return (['morning', 'afternoon', 'evening'] as const)
      .filter((period) => buckets[period].length > 0)
      .map((period) => ({ period, label: labels[period], slots: buckets[period] }));
  });

  protected readonly selectedDateLabel = computed(
    () => this.availableDates().find((date) => date.key === this.selectedDateKey())?.label ?? '',
  );

  protected readonly selectedSlotLabel = computed(() => {
    const slot = this.selectedSlot();
    return slot ? this.formatDateTime(slot) : '';
  });

  protected readonly steps = computed(() => {
    const copy = this.copy();
    return [
      { id: 'service' as const, label: copy.serviceStep, disabled: !this.canOpenStep('service') },
      { id: 'time' as const, label: copy.timeStep, disabled: !this.canOpenStep('time') },
      { id: 'details' as const, label: copy.detailsStep, disabled: !this.canOpenStep('details') },
      { id: 'review' as const, label: copy.reviewStep, disabled: !this.canOpenStep('review') },
    ];
  });

  protected readonly currentStepIndex = computed(() =>
    BOOKING_STEPS.indexOf(this.currentStep()),
  );

  private readonly slotCache = new Map<string, string[]>();
  private slotRequestId = 0;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }

    const slug = this.route.snapshot.queryParamMap.get('service');
    const preselectedVariant = this.route.snapshot.queryParamMap.get('variant');

    this.api.list().subscribe({
      next: (services) => {
        const active = [...services]
          .filter((s) => s.active && s.variants.some((v) => v.active))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        this.services.set(active);
        this.loading.set(false);
        if (active.length === 0) {
          return;
        }
        const initial = active.find((s) => s.slug === slug) ?? active[0];
        this.selectService(initial.id, preselectedVariant);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  protected onServiceChange(serviceId: string): void {
    this.selectService(serviceId, null);
  }

  protected selectVariant(id: string): void {
    if (id === this.selectedVariantId()) {
      return;
    }
    this.selectedVariantId.set(id);
    this.selectedDateKey.set(null);
    this.selectedSlot.set(null);
    this.loadSlots();
  }

  protected selectDate(dateKey: string): void {
    if (dateKey === this.selectedDateKey()) {
      return;
    }

    this.selectedDateKey.set(dateKey);
    this.selectedSlot.set(null);
    this.submitError.set(null);
  }

  protected selectSlot(iso: string): void {
    this.selectedSlot.set(iso);
    this.submitError.set(null);
  }

  protected openStep(step: BookingStep): void {
    if (this.canOpenStep(step)) {
      this.goToStep(step);
    }
  }

  protected onStepSelect(id: string): void {
    this.openStep(id as BookingStep);
  }

  private goToStep(step: BookingStep): void {
    this.stepDirection.set(
      BOOKING_STEPS.indexOf(step) >= this.currentStepIndex() ? 'forward' : 'backward',
    );
    this.currentStep.set(step);
  }

  protected canOpenStep(step: BookingStep): boolean {
    switch (step) {
      case 'service':
        return true;
      case 'time':
        return Boolean(this.selectedService() && this.selectedVariant());
      case 'details':
        return Boolean(this.selectedSlot());
      case 'review':
        return Boolean(this.selectedSlot() && this.form.valid);
    }
  }

  protected nextStep(): void {
    switch (this.currentStep()) {
      case 'service':
        if (this.selectedService() && this.selectedVariant()) {
          this.goToStep('time');
        }
        return;
      case 'time':
        if (!this.selectedSlot()) {
          this.submitError.set(this.copy().selectSlotFirst);
          return;
        }
        this.submitError.set(null);
        this.goToStep('details');
        return;
      case 'details':
        if (this.form.invalid) {
          this.form.markAllAsTouched();
          return;
        }
        this.goToStep('review');
        return;
      case 'review':
        this.submit();
        return;
    }
  }

  protected previousStep(): void {
    const index = this.currentStepIndex();
    if (index > 0) {
      this.goToStep(BOOKING_STEPS[index - 1]);
    }
  }

  protected submit(): void {
    const service = this.selectedService();
    const variant = this.selectedVariant();
    const slot = this.selectedSlot();
    if (!service || !variant || this.submitting()) {
      return;
    }
    if (!slot) {
      this.submitError.set(this.copy().selectSlotFirst);
      this.goToStep('time');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.goToStep('details');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    const { name, email, phone, notes } = this.form.getRawValue();

    this.bookingApi
      .createReservation({
        serviceId: service.id,
        serviceVariantId: variant.id,
        startsAt: slot,
        customer: { name, email, phone: phone.trim() || null },
        notes: notes.trim() || null,
      })
      .subscribe({
        next: (confirmation) => {
          this.confirmation.set(confirmation);
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 409 || err.status === 422) {
            this.submitError.set(this.copy().slotTakenError);
            this.selectedSlot.set(null);
            this.goToStep('time');
            this.loadSlots({ forceRefresh: true });
          } else {
            this.submitError.set(this.copy().submitError);
          }
        },
      });
  }

  protected resetForAnother(): void {
    this.confirmation.set(null);
    this.goToStep('service');
    this.selectedSlot.set(null);
    this.form.reset();
    this.loadSlots({ forceRefresh: true });
  }

  protected localizedName(service: Service): string {
    return localizedService(service, this.language.current().locale).name;
  }

  protected variantLabel(variant: ServiceVariant): string {
    return `${variant.durationMinutes} min · ${this.formatPrice(variant.price.amountCents)}`;
  }

  protected formatPrice(cents: number): string {
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  }

  protected formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat(this.language.current().locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BUSINESS_TIMEZONE,
    }).format(new Date(iso));
  }

  private selectService(serviceId: string, preselectedVariant: string | null): void {
    this.selectedServiceId.set(serviceId);
    this.selectedDateKey.set(null);
    this.selectedSlot.set(null);
    const variants = this.activeVariants();
    const variant =
      variants.find((v) => v.id === preselectedVariant) ?? variants[0] ?? null;
    this.selectedVariantId.set(variant?.id ?? null);
    if (variant) {
      this.loadSlots();
    } else {
      this.slots.set([]);
      this.selectedDateKey.set(null);
    }
  }

  private loadSlots(options: { readonly forceRefresh?: boolean } = {}): void {
    const service = this.selectedService();
    const variant = this.selectedVariant();
    if (!service || !variant) {
      return;
    }

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + BOOKING_WINDOW_DAYS);
    const startDate = this.isoDate(start);
    const endDate = this.isoDate(end);
    const cacheKey = `${service.id}:${variant.id}:${startDate}:${endDate}`;
    const requestId = ++this.slotRequestId;

    if (options.forceRefresh) {
      this.slotCache.delete(cacheKey);
    }

    const cachedSlots = this.slotCache.get(cacheKey);
    if (cachedSlots) {
      this.slots.set(cachedSlots);
      this.slotsLoading.set(false);
      this.slotsError.set(false);
      this.ensureSelectedDate();
      return;
    }

    this.slotsLoading.set(true);
    this.slotsError.set(false);

    this.bookingApi
      .availableSlots(startDate, endDate, service.id, variant.id)
      .subscribe({
        next: (slots) => {
          if (requestId !== this.slotRequestId) {
            return;
          }

          this.slotCache.set(cacheKey, slots);
          this.slots.set(slots);
          this.slotsLoading.set(false);
          this.ensureSelectedDate();
        },
        error: () => {
          if (requestId !== this.slotRequestId) {
            return;
          }

          this.slotsError.set(true);
          this.slotsLoading.set(false);
        },
      });
  }

  private isoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private groupByDate(slots: string[]): DateSlots[] {
    const dateFormat = new Intl.DateTimeFormat(this.language.current().locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: BUSINESS_TIMEZONE,
    });
    const timeFormat = new Intl.DateTimeFormat(this.language.current().locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BUSINESS_TIMEZONE,
    });
    const hourFormat = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: BUSINESS_TIMEZONE,
    });

    const dates = new Map<string, DateSlots & { slots: SlotView[] }>();
    for (const iso of slots) {
      const date = new Date(iso);
      const key = businessDateKey(date);
      let dateSlots = dates.get(key);
      if (!dateSlots) {
        dateSlots = {
          key,
          ...dateParts(dateFormat.formatToParts(date)),
          label: dateFormat.format(date),
          slots: [],
        };
        dates.set(key, dateSlots);
      }
      dateSlots.slots.push({
        iso,
        time: timeFormat.format(date),
        hour: Number.parseInt(hourFormat.format(date), 10),
      });
    }

    return [...dates.values()];
  }

  private ensureSelectedDate(): void {
    const selectedDateKey = this.selectedDateKey();
    const dates = this.availableDates();
    if (selectedDateKey && dates.some((date) => date.key === selectedDateKey)) {
      return;
    }

    this.selectedDateKey.set(dates[0]?.key ?? null);
  }
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function businessDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dateParts(parts: Intl.DateTimeFormatPart[]): {
  readonly weekday: string;
  readonly day: string;
  readonly month: string;
} {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return {
    weekday: part('weekday'),
    day: part('day'),
    month: part('month'),
  };
}
