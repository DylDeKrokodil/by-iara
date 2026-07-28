import {
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ChoiceChip,
  DetailList,
  DetailListItem,
  EmptyState,
  SelectField,
  SelectFieldOption,
  SelectableTile,
  Skeleton,
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
import {
  BookingApi,
  BUSINESS_TIMEZONE,
  ReservationConfirmation,
  CustomerPack,
  DiscountQuote,
} from './booking-api';
import {
  bookingCalendarMonth,
  selectedOrFirstAvailableDateKey,
} from './booking-calendar';
import { publicEmailValidator } from './email-validator';
import { slotPeriod, SlotPeriod } from './booking-period';
import { BUSINESS_DETAILS, getWhatsAppHref } from '../legal/business-details';

type BookingStep = 'service' | 'time' | 'details' | 'review';
const BOOKING_STEPS: readonly BookingStep[] = [
  'service',
  'time',
  'details',
  'review',
];
const CUSTOMER_SESSION_KEY = 'byiara.customer-pack-session';

interface SlotView {
  readonly iso: string;
  readonly time: string;
  readonly hour: number;
}

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

interface CalendarDay {
  readonly key: string;
  readonly weekday: string;
  readonly day: string;
  readonly month: string;
  readonly label: string;
  readonly inMonth: boolean;
  readonly isPast: boolean;
  readonly available: boolean;
}

@Component({
  selector: 'byiara-booking',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SelectField,
    ChoiceChip,
    SelectableTile,
    Stepper,
    TextField,
    DetailList,
    EmptyState,
    Skeleton,
  ],
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
  private readonly bookingStepTop = viewChild<ElementRef<HTMLElement>>('bookingStepTop');
  private readonly mobileDateStrip =
    viewChild<ElementRef<HTMLElement>>('mobileDateStrip');
  private readonly timeChoicesSection =
    viewChild<ElementRef<HTMLElement>>('timeChoicesSection');

  protected readonly copy = computed(() => this.language.messages().booking);

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly services = signal<Service[]>([]);

  protected readonly selectedServiceId = signal<string | null>(null);
  protected readonly selectedVariantId = signal<string | null>(null);
  protected readonly selectedPackOfferId = signal<string | null>(null);
  protected readonly selectedCustomerPackId = signal<string | null>(null);
  protected readonly customerSessionToken = signal<string | null>(null);
  protected readonly customerPacks = signal<CustomerPack[]>([]);
  protected readonly accessRequesting = signal(false);
  protected readonly accessSent = signal(false);
  protected readonly accessError = signal(false);
  protected readonly slots = signal<string[]>([]);
  protected readonly slotsLoading = signal(false);
  protected readonly slotsError = signal(false);
  protected readonly calendarMonthOffset = signal(0);
  protected readonly calendarSkeletonWeekdays = Array.from(
    { length: 7 },
    (_, index) => index,
  );
  protected readonly calendarSkeletonDays = Array.from(
    { length: 42 },
    (_, index) => index,
  );
  protected readonly calendarSkeletonMobileDays = Array.from(
    { length: 5 },
    (_, index) => index,
  );
  protected readonly calendarSkeletonSlotGroups = Array.from(
    { length: 2 },
    (_, index) => index,
  );
  protected readonly calendarSkeletonSlots = Array.from(
    { length: 4 },
    (_, index) => index,
  );
  protected readonly selectedDateKey = signal<string | null>(null);
  protected readonly selectedSlot = signal<string | null>(null);
  protected readonly currentStep = signal<BookingStep>('service');
  protected readonly stepDirection = signal<'forward' | 'backward'>('forward');

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly discountQuote = signal<DiscountQuote | null>(null);
  protected readonly discountApplying = signal(false);
  protected readonly discountError = signal<string | null>(null);
  protected readonly appliedDiscountCode = signal<string | null>(null);
  protected readonly confirmation = signal<ReservationConfirmation | null>(
    null,
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, publicEmailValidator]],
    phone: [''],
    notes: [''],
    discountCode: [''],
  });

  protected readonly serviceOptions = computed<SelectFieldOption[]>(() =>
    this.services().map((service) => ({
      label: this.localizedName(service),
      value: service.id,
    })),
  );

  protected readonly selectedService = computed(
    () =>
      this.services().find((s) => s.id === this.selectedServiceId()) ?? null,
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
    () =>
      this.activeVariants().find((v) => v.id === this.selectedVariantId()) ??
      null,
  );

  protected readonly availablePackOffers = computed(() => {
    const service = this.selectedService();
    const variant = this.selectedVariant();
    if (!service || !variant) return [];
    return (service.packOffers ?? []).filter(
      (offer) =>
        offer.active && offer.durationMinutes === variant.durationMinutes,
    );
  });

  protected readonly eligibleCustomerPacks = computed(() => {
    const service = this.selectedService();
    const variant = this.selectedVariant();
    if (!service || !variant) return [];
    return this.customerPacks().filter(
      (pack) =>
        pack.serviceId === service.id &&
        pack.durationMinutes === variant.durationMinutes &&
        pack.remainingSessions > 0,
    );
  });

  protected readonly availableDates = computed(() =>
    this.groupByDate(this.slots()),
  );

  protected readonly selectedDateSlots = computed(() => {
    const selectedDateKey = this.selectedDateKey();
    if (!selectedDateKey) {
      return [];
    }

    return (
      this.availableDates().find((date) => date.key === selectedDateKey)
        ?.slots ?? []
    );
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
      const period = slotPeriod(slot.hour);
      buckets[period].push(slot);
    }
    const labels: Record<SlotPeriod, string> = {
      morning: copy.periodMorning,
      afternoon: copy.periodAfternoon,
      evening: copy.periodEvening,
    };
    return (['morning', 'afternoon', 'evening'] as const)
      .filter((period) => buckets[period].length > 0)
      .map((period) => ({
        period,
        label: labels[period],
        slots: buckets[period],
      }));
  });

  protected readonly selectedDateLabel = computed(
    () =>
      this.availableDates().find((date) => date.key === this.selectedDateKey())
        ?.label ?? '',
  );

  protected readonly selectedSlotLabel = computed(() => {
    const slot = this.selectedSlot();
    return slot ? this.formatDateTime(slot) : '';
  });

  protected readonly calendarMonth = computed(() =>
    bookingCalendarMonth(new Date(), this.calendarMonthOffset()),
  );

  protected readonly calendarMonthLabel = computed(() => {
    const label = new Intl.DateTimeFormat(this.language.current().locale, {
      month: 'long',
      year: 'numeric',
    }).format(this.calendarMonth().firstDay);
    return (
      label.charAt(0).toLocaleUpperCase(this.language.current().locale) +
      label.slice(1)
    );
  });

  protected readonly calendarWeekdays = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.language.current().locale, {
      weekday: 'short',
    });
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      return formatter.format(day).replace('.', '').slice(0, 3);
    });
  });

  protected readonly calendarDays = computed<CalendarDay[]>(() => {
    const month = this.calendarMonth();
    const availableKeys = new Set(
      this.availableDates().map((date) => date.key),
    );
    const todayKey = businessDateKey(new Date());
    const labelFormatter = new Intl.DateTimeFormat(
      this.language.current().locale,
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      },
    );
    const weekdayFormatter = new Intl.DateTimeFormat(
      this.language.current().locale,
      { weekday: 'short' },
    );
    const monthFormatter = new Intl.DateTimeFormat(
      this.language.current().locale,
      { month: 'short' },
    );

    return Array.from({ length: month.gridDayCount }, (_, index) => {
      const date = new Date(month.gridStart);
      date.setDate(month.gridStart.getDate() + index);
      const key = businessDateKey(date);
      return {
        key,
        weekday: weekdayFormatter.format(date).replace('.', ''),
        day: `${date.getDate()}`,
        month: monthFormatter.format(date).replace('.', ''),
        label: labelFormatter.format(date),
        inMonth: date.getMonth() === month.firstDay.getMonth(),
        isPast: key < todayKey,
        available: availableKeys.has(key),
      };
    });
  });

  protected readonly mobileCalendarDays = computed(() =>
    this.calendarDays().filter((day) => day.inMonth && !day.isPast),
  );

  protected readonly calendarHasAvailability = computed(() =>
    this.calendarDays().some((day) => day.inMonth && day.available),
  );

  protected readonly contact = {
    email: BUSINESS_DETAILS.email,
    emailHref: `mailto:${BUSINESS_DETAILS.email}`,
    phone: BUSINESS_DETAILS.phone,
    whatsAppHref: getWhatsAppHref(BUSINESS_DETAILS.phone),
  };

  protected readonly steps = computed(() => {
    const copy = this.copy();
    return [
      {
        id: 'service' as const,
        label: copy.serviceStep,
        disabled: !this.canOpenStep('service'),
      },
      {
        id: 'time' as const,
        label: copy.timeStep,
        disabled: !this.canOpenStep('time'),
      },
      {
        id: 'details' as const,
        label: copy.detailsStep,
        disabled: !this.canOpenStep('details'),
      },
      {
        id: 'review' as const,
        label: copy.reviewStep,
        disabled: !this.canOpenStep('review'),
      },
    ];
  });

  protected readonly currentStepIndex = computed(() =>
    BOOKING_STEPS.indexOf(this.currentStep()),
  );

  protected readonly mobilePrimaryActionLabel = computed(() => {
    const copy = this.copy();

    switch (this.currentStep()) {
      case 'details':
        return copy.reviewBooking;
      case 'review':
        return this.submitting() ? copy.submitting : copy.submit;
      default:
        return copy.next;
    }
  });

  private readonly slotCache = new Map<string, string[]>();
  private slotRequestId = 0;

  ngOnInit(): void {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (isBrowser) {
      this.form.controls.email.valueChanges.subscribe(() =>
        this.clearDiscount(false),
      );

      const accessToken = this.route.snapshot.queryParamMap.get('packAccess');
      if (accessToken) {
        this.exchangePackAccess(accessToken);
      } else {
        this.restoreCustomerSession();
      }
    }

    const slug = this.route.snapshot.queryParamMap.get('service');
    const preselectedVariant = this.route.snapshot.queryParamMap.get('variant');
    const preselectedPack = this.route.snapshot.queryParamMap.get('pack');

    this.api.list().subscribe({
      next: (services) => {
        const locale = this.language.current().locale;
        const active = [...services]
          .filter(
            (s) =>
              s.active &&
              s.translations[locale] &&
              s.variants.some((v) => v.active),
          )
          .sort((a, b) => a.sortOrder - b.sortOrder);
        this.services.set(active);
        this.loading.set(false);
        if (active.length === 0) {
          return;
        }
        const initial = active.find((s) => s.slug === slug) ?? active[0];
        this.selectService(
          initial.id,
          preselectedVariant,
          preselectedPack,
          isBrowser,
        );
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
    this.selectRegularSession();
    this.calendarMonthOffset.set(0);
    this.selectedDateKey.set(null);
    this.selectedSlot.set(null);
    this.loadSlots();
  }

  protected selectRegularSession(): void {
    this.selectedPackOfferId.set(null);
    this.selectedCustomerPackId.set(null);
    this.clearDiscount();
  }

  protected selectPackOffer(id: string): void {
    this.clearDiscount();
    this.selectedPackOfferId.set(id);
    this.selectedCustomerPackId.set(null);
  }

  protected selectCustomerPack(id: string): void {
    this.clearDiscount();
    this.selectedCustomerPackId.set(id);
    this.selectedPackOfferId.set(null);
  }

  protected requestPackAccess(): void {
    const emailControl = this.form.controls.email;
    emailControl.markAsTouched();
    if (emailControl.invalid || this.accessRequesting()) return;
    this.accessRequesting.set(true);
    this.accessError.set(false);
    this.bookingApi
      .requestPackAccess(emailControl.value, this.language.current().path)
      .subscribe({
        next: () => {
          this.accessRequesting.set(false);
          this.accessSent.set(true);
        },
        error: () => {
          this.accessRequesting.set(false);
          this.accessError.set(true);
        },
      });
  }

  protected selectDate(dateKey: string): void {
    if (dateKey === this.selectedDateKey()) {
      return;
    }

    this.selectedDateKey.set(dateKey);
    this.selectedSlot.set(null);
    this.submitError.set(null);
    this.revealSelectedMobileDate();
    this.revealTimeChoices();
  }

  protected selectSlot(iso: string): void {
    this.selectedSlot.set(iso);
    this.submitError.set(null);
  }

  private revealTimeChoices(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    requestAnimationFrame(() => {
      const section = this.timeChoicesSection()?.nativeElement;
      if (!section) {
        return;
      }

      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      section.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      section.focus({ preventScroll: true });
    });
  }

  protected nextCalendarMonth(): void {
    this.calendarMonthOffset.update((offset) => offset + 1);
    this.resetTimeSelection();
    this.loadSlots();
  }

  protected previousCalendarMonth(): void {
    if (this.calendarMonthOffset() === 0) {
      return;
    }
    this.calendarMonthOffset.update((offset) => offset - 1);
    this.resetTimeSelection();
    this.loadSlots();
  }

  protected retryAvailability(): void {
    this.loadSlots({ forceRefresh: true });
  }

  protected chooseAnotherTreatment(): void {
    this.goToStep('service');
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
      BOOKING_STEPS.indexOf(step) >= this.currentStepIndex()
        ? 'forward'
        : 'backward',
    );
    this.currentStep.set(step);
    this.scrollToStepTop();
    if (step === 'time') {
      this.revealSelectedMobileDate();
    }
  }

  private scrollToStepTop(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.requestAnimationFrame(() => {
      this.bookingStepTop()?.nativeElement.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
    });
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

  protected canContinueCurrentStep(): boolean {
    switch (this.currentStep()) {
      case 'service':
        return this.canOpenStep('time');
      case 'time':
        return this.canOpenStep('details');
      case 'details':
        return this.canOpenStep('review');
      case 'review':
        return true;
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
        locale: this.language.current().path,
        packOfferId: this.selectedPackOfferId(),
        customerPackId: this.selectedCustomerPackId(),
        customerSessionToken: this.customerSessionToken(),
        discountCode: this.appliedDiscountCode(),
      })
      .subscribe({
        next: (confirmation) => {
          this.confirmation.set(confirmation);
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 400 && this.appliedDiscountCode()) {
            this.clearDiscount(false);
            this.submitError.set(this.copy().discountUnavailable);
          } else if (err.status === 409 || err.status === 422) {
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
    this.clearDiscount();
    this.loadSlots({ forceRefresh: true });
  }

  protected localizedName(service: Service): string {
    return localizedService(service, this.language.current().locale).name;
  }

  protected variantLabel(variant: ServiceVariant): string {
    return `${variant.durationMinutes} min · ${this.formatPrice(variant.price.amountCents)}`;
  }

  protected packOfferLabel(
    offer: NonNullable<Service['packOffers']>[number],
  ): string {
    return this.copy().buyPackLabel(
      offer.sessionCount,
      offer.durationMinutes,
      this.formatPrice(offer.price.amountCents),
    );
  }

  protected customerPackLabel(pack: CustomerPack): string {
    return this.copy().usePackLabel(pack.remainingSessions);
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

  protected summaryItems(): DetailListItem[] {
    const copy = this.copy();
    const variant = this.selectedVariant();
    const packOffer = this.availablePackOffers().find(
      (offer) => offer.id === this.selectedPackOfferId(),
    );
    const customerPack = this.eligibleCustomerPacks().find(
      (pack) => pack.id === this.selectedCustomerPackId(),
    );
    const items: DetailListItem[] = [
      {
        term: copy.confirmedService,
        detail: this.serviceTitle() || copy.notSelected,
      },
      {
        term: copy.chooseOption,
        detail: variant ? this.variantLabel(variant) : copy.notSelected,
      },
      {
        term: copy.paymentChoice,
        detail: customerPack
          ? this.customerPackLabel(customerPack)
          : packOffer
            ? this.packOfferLabel(packOffer)
            : copy.singleSession,
      },
      {
        term: copy.chooseDate,
        detail: this.selectedDateLabel() || copy.notSelected,
      },
      {
        term: copy.chooseSlot,
        detail: this.selectedSlotLabel() || copy.notSelected,
      },
    ];
    items.push(...this.discountPriceItems());
    return items;
  }

  private discountPriceItems(): DetailListItem[] {
    const quote = this.discountQuote();
    if (
      !quote ||
      this.selectedPackOfferId() ||
      this.selectedCustomerPackId()
    ) {
      return [];
    }

    const copy = this.copy();
    return [
      {
        term: copy.originalPrice,
        detail: this.formatPrice(quote.originalPrice.amountCents),
      },
      {
        term: copy.discount,
        detail: `−${this.formatPrice(quote.discountAmount.amountCents)}`,
      },
      {
        term: copy.totalPrice,
        detail: this.formatPrice(quote.finalPrice.amountCents),
      },
    ];
  }

  protected applyDiscount(): void {
    const service = this.selectedService();
    const variant = this.selectedVariant();
    const email = this.form.controls.email.value.trim();
    const code = this.form.controls.discountCode.value.trim();
    if (!service || !variant || !code || this.selectedPackOfferId() || this.selectedCustomerPackId()) return;
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.discountError.set(this.copy().discountNeedsEmail);
      return;
    }
    this.discountApplying.set(true);
    this.discountError.set(null);
    this.bookingApi.previewDiscount({
      serviceId: service.id,
      serviceVariantId: variant.id,
      customerEmail: email,
      discountCode: code,
    }).subscribe({
      next: (quote) => {
        this.discountQuote.set(quote);
        this.appliedDiscountCode.set(code);
        this.discountApplying.set(false);
      },
      error: () => {
        this.clearDiscount(false);
        this.discountApplying.set(false);
        this.discountError.set(this.copy().discountUnavailable);
      },
    });
  }

  protected removeDiscount(): void {
    this.form.controls.discountCode.setValue('');
    this.clearDiscount(false);
  }

  private clearDiscount(clearCode = true): void {
    this.discountQuote.set(null);
    this.appliedDiscountCode.set(null);
    this.discountError.set(null);
    if (clearCode) this.form.controls.discountCode.setValue('', { emitEvent: false });
  }

  private exchangePackAccess(token: string): void {
    this.bookingApi.exchangePackAccess(token).subscribe({
      next: (access) => {
        this.customerSessionToken.set(access.sessionToken);
        this.customerPacks.set(access.packs);
        sessionStorage.setItem(CUSTOMER_SESSION_KEY, access.sessionToken);
        this.form.patchValue({
          name: access.customer.name,
          email: access.customer.email,
          phone: access.customer.phone ?? '',
        });
        const url = new URL(window.location.href);
        url.searchParams.delete('packAccess');
        window.history.replaceState(
          {},
          '',
          `${url.pathname}${url.search}${url.hash}`,
        );
      },
      error: () => this.accessError.set(true),
    });
  }

  private restoreCustomerSession(): void {
    const token = sessionStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!token) return;
    this.bookingApi.customerPacks(token).subscribe({
      next: (packs) => {
        this.customerSessionToken.set(token);
        this.customerPacks.set(packs);
      },
      error: () => sessionStorage.removeItem(CUSTOMER_SESSION_KEY),
    });
  }

  // A plain method, not a computed: the review reads live form values, which
  // are not signals, so it must re-evaluate on every change detection.
  protected reviewItems(): DetailListItem[] {
    const copy = this.copy();
    const variant = this.selectedVariant();
    const { name, email, phone, notes } = this.form.getRawValue();
    const items: DetailListItem[] = [
      { term: copy.confirmedService, detail: this.serviceTitle() },
    ];
    if (variant) {
      items.push({
        term: copy.chooseOption,
        detail: this.variantLabel(variant),
      });
    }
    items.push({ term: copy.confirmedWhen, detail: this.selectedSlotLabel() });
    items.push({ term: copy.name, detail: name });
    items.push({ term: copy.email, detail: email });
    if (phone) {
      items.push({ term: copy.phone, detail: phone });
    }
    if (notes) {
      items.push({ term: copy.notes, detail: notes });
    }
    items.push(...this.discountPriceItems());
    return items;
  }

  protected confirmationItems(
    confirmed: ReservationConfirmation,
  ): DetailListItem[] {
    const copy = this.copy();
    return [
      {
        term: copy.confirmedService,
        detail: `${this.serviceTitle()} · ${confirmed.durationMinutes} min`,
      },
      {
        term: copy.confirmedWhen,
        detail: this.formatDateTime(confirmed.startsAt),
      },
    ];
  }

  private selectService(
    serviceId: string,
    preselectedVariant: string | null,
    preselectedPack: string | null = null,
    loadAvailability = true,
  ): void {
    this.selectedServiceId.set(serviceId);
    this.selectedPackOfferId.set(null);
    this.selectedCustomerPackId.set(null);
    this.calendarMonthOffset.set(0);
    this.selectedDateKey.set(null);
    this.selectedSlot.set(null);
    const variants = this.activeVariants();
    const variant =
      variants.find((v) => v.id === preselectedVariant) ?? variants[0] ?? null;
    this.selectedVariantId.set(variant?.id ?? null);
    const pack = this.availablePackOffers().find(
      (offer) => offer.id === preselectedPack,
    );
    this.selectedPackOfferId.set(pack?.id ?? null);
    if (variant && loadAvailability) {
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

    const month = this.calendarMonth();
    const startDate = this.isoDate(month.firstDay);
    const endDate = this.isoDate(month.lastDay);
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

    return [...dates.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  private ensureSelectedDate(): void {
    const selectedDateKey = selectedOrFirstAvailableDateKey(
      this.availableDates().map((date) => date.key),
      this.selectedDateKey(),
    );
    this.selectedDateKey.set(selectedDateKey);
    this.selectedSlot.set(null);
    this.revealSelectedMobileDate();
  }

  private revealSelectedMobileDate(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    requestAnimationFrame(() => {
      const selectedDateKey = this.selectedDateKey();
      const strip = this.mobileDateStrip()?.nativeElement;
      if (!selectedDateKey || !strip) {
        return;
      }

      const selectedDate = Array.from(strip.children).find(
        (element) =>
          element instanceof HTMLElement &&
          element.dataset['dateKey'] === selectedDateKey,
      );
      selectedDate?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'nearest',
        inline: 'start',
      });
    });
  }

  private resetTimeSelection(): void {
    this.selectedDateKey.set(null);
    this.selectedSlot.set(null);
    this.submitError.set(null);
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
