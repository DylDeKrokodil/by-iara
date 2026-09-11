import {
  Component,
  OnInit,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BUSINESS_TIME_ZONE } from '@by-iara/config';
import { forkJoin } from 'rxjs';
import {
  Alert,
  Button,
  Card,
  DataTable,
  DataTableColumn,
  EmptyState,
  PageHeader,
  SelectField,
  SelectFieldOption,
  StatusChip,
  TabOption,
  Tabs,
} from '@by-iara/shared-ui';
import { formatMoney } from '../services/service.models';
import { AvailabilityApi } from '../availability/availability-api';
import {
  AvailabilityBlock,
  AvailabilityRule,
} from '../availability/availability.models';
import { CalendarSync } from './calendar-sync/calendar-sync';
import {
  AttentionReason,
  ReservationAttention,
  ReservationResponse,
  ReservationStatus,
  reservationStatusLabel,
  reservationStatusTone,
} from './reservation.models';
import { ReservationsApi } from './reservations-api';
import {
  connectFragmentTab,
  navigateToFragmentTab,
} from '../core/fragment-tab-state';

const reservationViewValues = ['attention', 'calendar', 'history'] as const;
type ReservationView = (typeof reservationViewValues)[number];

const historyFilterValues = [
  'all',
  'rejected',
  'cancelled',
  'completed',
  'no_show',
  'past_confirmed',
] as const;

type HistoryFilter = (typeof historyFilterValues)[number];

const historyFilters: ReadonlyArray<SelectFieldOption> = [
  { label: 'All history', value: 'all' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Completed', value: 'completed' },
  { label: 'No-show', value: 'no_show' },
  { label: 'Past confirmed', value: 'past_confirmed' },
];

const reservationColumns: ReadonlyArray<DataTableColumn> = [
  { key: 'customer', label: 'Customer' },
  { key: 'service', label: 'Service' },
  { key: 'when', label: 'Date & Time' },
  { key: 'status', label: 'Status', fit: true },
  { key: 'notes', label: 'Notes' },
];

const attentionColumns: ReadonlyArray<DataTableColumn> = [
  { key: 'customer', label: 'Customer' },
  { key: 'appointment', label: 'Appointment' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'balance', label: 'Balance', fit: true },
  { key: 'action', label: 'Action', fit: true },
];

const historyPageSize = 10;
const attentionPageSize = 20;
const calendarPageSize = 250;

interface AgendaGroup {
  key: string;
  label: string;
  heading: string;
  weekday: string;
  day: string;
  count: number;
  isSelected: boolean;
  isToday: boolean;
  reservations: ReservationResponse[];
  availability: CalendarInterval[];
  blocks: CalendarInterval[];
  capacityKnown: boolean;
  workloadPercent: number;
  availabilityLabel: string;
}

interface CalendarDay {
  key: string;
  weekday: string;
  day: string;
  count: number;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth?: boolean;
  capacityKnown: boolean;
  workloadPercent: number;
  availabilityLabel: string;
}

interface CalendarInterval {
  startMinutes: number;
  endMinutes: number;
  label: string;
}

interface CalendarHour {
  label: string;
  minutes: number;
  position: number;
}

function isReservationView(value: string): value is ReservationView {
  return reservationViewValues.includes(value as ReservationView);
}

function isHistoryFilter(value: string): value is HistoryFilter {
  return historyFilterValues.includes(value as HistoryFilter);
}

@Component({
  selector: 'byiara-reservations',
  imports: [
    Alert,
    Button,
    CalendarSync,
    Card,
    DataTable,
    EmptyState,
    PageHeader,
    SelectField,
    StatusChip,
    Tabs,
    RouterLink,
  ],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class Reservations implements OnInit {
  private readonly api = inject(ReservationsApi);
  private readonly availabilityApi = inject(AvailabilityApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly calendarSyncOpen = signal(false);
  protected readonly activeView = signal<ReservationView>('attention');
  protected readonly selectedDateKey = signal(this.dateKey(new Date()));
  protected readonly calendarView = signal<'day' | 'week' | 'month'>('week');
  protected readonly attention = signal<ReservationAttention[]>([]);
  /** Set from ?id= when arriving via the "new reservation" admin email link. */
  protected readonly highlightId = signal<string | null>(null);
  private hasScrolledToHighlight = false;
  protected readonly calendarReservations = signal<ReservationResponse[]>([]);
  protected readonly availabilityRules = signal<AvailabilityRule[]>([]);
  protected readonly availabilityBlocks = signal<AvailabilityBlock[]>([]);
  protected readonly availabilityReady = signal(false);
  protected readonly history = signal<ReservationResponse[]>([]);

  private loadedFrom: string | null = null;
  private loadedTo: string | null = null;

  protected readonly loadingAttention = signal(false);
  protected readonly loadingCalendar = signal(false);
  protected readonly loadingAvailability = signal(false);
  protected readonly loadingHistory = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly availabilityError = signal<string | null>(null);

  protected readonly historyFilter = signal<HistoryFilter>('all');
  protected readonly historyPage = signal(0);
  protected readonly historyTotal = signal(0);
  protected readonly attentionPage = signal(0);
  protected readonly attentionTotal = signal(0);

  protected readonly reservationTabs = computed<ReadonlyArray<TabOption>>(
    () => [
      {
        label:
          this.attentionTotal() > 0
            ? `Needs attention (${this.attentionTotal()})`
            : 'Needs attention',
        value: 'attention',
      },
      { label: 'Calendar', value: 'calendar' },
      { label: 'History', value: 'history' },
    ],
  );
  protected readonly reservationColumns = reservationColumns;
  protected readonly attentionColumns = attentionColumns;
  protected readonly historyFilters = historyFilters;
  protected readonly formatMoney = formatMoney;

  protected readonly todayKey = computed(() => this.dateKey(new Date()));
  protected readonly calendarStartKey = computed(() =>
    this.startOfWeekKey(this.selectedDateKey()),
  );
  protected readonly calendarEndKey = computed(() =>
    this.addDays(this.calendarStartKey(), 6),
  );
  protected readonly calendarRangeLabel = computed(
    () =>
      `${this.formatShortDate(this.calendarStartKey())} - ${this.formatShortDate(
        this.calendarEndKey(),
      )}`,
  );
  protected readonly calendarPeriodLabel = computed(() => {
    if (this.calendarView() === 'day') {
      return this.formatLongDate(this.selectedDateKey());
    }

    if (this.calendarView() === 'month') {
      return this.currentMonthLabel();
    }

    return this.calendarRangeLabel();
  });
  protected readonly currentMonthLabel = computed(() => {
    const date = this.utcDateFromKey(this.selectedDateKey());
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  });
  protected readonly selectedDayReservations = computed(() =>
    this.calendarReservations().filter(
      (reservation) =>
        this.dateKey(reservation.startsAt) === this.selectedDateKey(),
    ),
  );
  protected readonly calendarDays = computed<CalendarDay[]>(() => {
    const counts = new Map<string, number>();

    for (const reservation of this.calendarReservations()) {
      const key = this.dateKey(reservation.startsAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from({ length: 7 }, (_, index) => {
      const key = this.addDays(this.calendarStartKey(), index);
      return {
        key,
        weekday: this.formatWeekday(key),
        day: this.formatDayNumber(key),
        count: counts.get(key) ?? 0,
        isSelected: key === this.selectedDateKey(),
        isToday: key === this.todayKey(),
        ...this.dayCapacity(key, this.reservationsForDay(key)),
      };
    });
  });
  protected readonly agendaGroups = computed<AgendaGroup[]>(() => {
    const reservationsByDay = new Map<string, ReservationResponse[]>();

    for (const reservation of this.calendarReservations()) {
      const key = this.dateKey(reservation.startsAt);
      reservationsByDay.set(key, [
        ...(reservationsByDay.get(key) ?? []),
        reservation,
      ]);
    }

    return this.calendarDays().map((day) => {
      const reservations = reservationsByDay.get(day.key) ?? [];

      return {
        key: day.key,
        label: this.formatDateGroupLabel(day.key),
        heading: this.formatLongDate(day.key),
        weekday: day.weekday,
        day: day.day,
        count: reservations.length,
        isSelected: day.isSelected,
        isToday: day.isToday,
        reservations,
        availability: this.availabilityIntervalsForDay(day.key),
        blocks: this.blockIntervalsForDay(day.key),
        capacityKnown: day.capacityKnown,
        workloadPercent: day.workloadPercent,
        availabilityLabel: day.availabilityLabel,
      };
    });
  });
  protected readonly monthGridDays = computed<CalendarDay[]>(() => {
    const selectedDate = this.utcDateFromKey(this.selectedDateKey());
    const selectedMonth = selectedDate.getUTCMonth();
    const selectedYear = selectedDate.getUTCFullYear();
    const { startKey } = this.getMonthGridRange(this.selectedDateKey());
    const counts = new Map<string, number>();

    for (const reservation of this.calendarReservations()) {
      const key = this.dateKey(reservation.startsAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from({ length: 42 }, (_, index) => {
      const key = this.addDays(startKey, index);
      const date = this.utcDateFromKey(key);
      return {
        key,
        weekday: this.formatWeekday(key),
        day: date.getUTCDate().toString(),
        count: counts.get(key) ?? 0,
        isSelected: key === this.selectedDateKey(),
        isToday: key === this.todayKey(),
        isCurrentMonth:
          date.getUTCMonth() === selectedMonth &&
          date.getUTCFullYear() === selectedYear,
        ...this.dayCapacity(key, this.reservationsForDay(key)),
      };
    });
  });
  protected readonly scheduleStartMinutes = computed(() => {
    const starts = [9 * 60];

    for (const rule of this.availabilityRules()) {
      starts.push(this.clockMinutes(rule.startTime));
    }

    for (const reservation of this.visibleWeekReservations()) {
      starts.push(this.minutesInBusinessDay(reservation.startsAt));
    }

    return Math.max(0, Math.floor(Math.min(...starts) / 60) * 60);
  });
  protected readonly scheduleEndMinutes = computed(() => {
    const ends = [18 * 60];

    for (const rule of this.availabilityRules()) {
      ends.push(this.clockMinutes(rule.endTime));
    }

    for (const reservation of this.visibleWeekReservations()) {
      ends.push(this.minutesInBusinessDay(reservation.endsAt));
    }

    return Math.min(24 * 60, Math.ceil(Math.max(...ends) / 60) * 60);
  });
  protected readonly scheduleHours = computed<CalendarHour[]>(() => {
    const start = this.scheduleStartMinutes();
    const end = this.scheduleEndMinutes();
    const duration = Math.max(end - start, 60);
    const hours: CalendarHour[] = [];

    for (let minutes = start; minutes <= end; minutes += 60) {
      hours.push({
        label: this.formatClockMinutes(minutes),
        minutes,
        position: ((minutes - start) / duration) * 100,
      });
    }

    return hours;
  });
  protected readonly totalHistoryPages = computed(() =>
    Math.max(Math.ceil(this.historyTotal() / historyPageSize), 1),
  );
  protected readonly historyRangeStart = computed(() =>
    this.historyTotal() === 0 ? 0 : this.historyPage() * historyPageSize + 1,
  );
  protected readonly historyRangeEnd = computed(() =>
    Math.min((this.historyPage() + 1) * historyPageSize, this.historyTotal()),
  );
  protected readonly canGoToPreviousHistoryPage = computed(
    () => this.historyPage() > 0,
  );
  protected readonly canGoToNextHistoryPage = computed(
    () => this.historyPage() + 1 < this.totalHistoryPages(),
  );
  protected readonly totalAttentionPages = computed(() =>
    Math.max(Math.ceil(this.attentionTotal() / attentionPageSize), 1),
  );
  protected readonly canGoToPreviousAttentionPage = computed(
    () => this.attentionPage() > 0,
  );
  protected readonly canGoToNextAttentionPage = computed(
    () => this.attentionPage() + 1 < this.totalAttentionPages(),
  );

  constructor() {
    // Runs once the target reservation actually shows up in the attention queue.
    // e.g. after the admin accepts/declines something else in the list.
    effect(() => {
      const id = this.highlightId();
      if (!id || this.hasScrolledToHighlight) {
        return;
      }
      if (this.attention().some((item) => item.reservation.id === id)) {
        this.hasScrolledToHighlight = true;
        // Double rAF: a single frame isn't always enough for the browser to have
        // finished layout after this DOM update, which left scrollIntoView measuring
        // a stale (still-collapsing) position and barely scrolling at all.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const element = document.getElementById(`reservation-${id}`);
            // scrollIntoView is unimplemented in jsdom (unit tests); real browsers always have it.
            element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          });
        });
      }
    });
  }

  ngOnInit(): void {
    this.highlightId.set(this.route.snapshot.queryParamMap.get('id'));
    connectFragmentTab({
      allowedValues: reservationViewValues,
      defaultValue: 'attention',
      destroyRef: this.destroyRef,
      route: this.route,
      router: this.router,
      state: this.activeView,
    });
    this.reload();
  }

  protected toggleCalendarSync(): void {
    this.calendarSyncOpen.update((open) => !open);
  }

  protected setActiveView(view: string): void {
    if (!isReservationView(view)) {
      return;
    }

    this.activeView.set(view);
    void navigateToFragmentTab(this.router, this.route, view);
  }

  protected reload(): void {
    this.reloadAttention();
    this.reloadCalendar(true);
    this.reloadHistory();
  }

  protected setCalendarView(view: 'day' | 'week' | 'month'): void {
    this.calendarView.set(view);
    this.reloadCalendar();
  }

  protected previousCalendarPeriod(): void {
    if (this.calendarView() === 'day') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), -1));
    } else if (this.calendarView() === 'week') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), -7));
    } else if (this.calendarView() === 'month') {
      this.selectedDateKey.set(this.addMonths(this.selectedDateKey(), -1));
    }
    this.reloadCalendar();
  }

  protected nextCalendarPeriod(): void {
    if (this.calendarView() === 'day') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), 1));
    } else if (this.calendarView() === 'week') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), 7));
    } else if (this.calendarView() === 'month') {
      this.selectedDateKey.set(this.addMonths(this.selectedDateKey(), 1));
    }
    this.reloadCalendar();
  }

  protected goToToday(): void {
    this.selectedDateKey.set(this.todayKey());
    this.reloadCalendar();
  }

  protected selectCalendarDay(dayKey: string): void {
    if (dayKey === this.selectedDateKey()) {
      return;
    }

    this.selectedDateKey.set(dayKey);
    this.reloadCalendar();
  }

  protected selectMonthGridDay(dayKey: string): void {
    this.selectedDateKey.set(dayKey);
    this.calendarView.set('day');
    this.reloadCalendar();
  }

  protected onDatePickerChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (!value || value === this.selectedDateKey()) {
      return;
    }

    this.selectedDateKey.set(value);
    this.reloadCalendar();
  }

  protected onHistoryFilterChange(filter: string): void {
    if (!isHistoryFilter(filter) || filter === this.historyFilter()) {
      return;
    }

    this.historyFilter.set(filter);
    this.historyPage.set(0);
    this.reloadHistory();
  }

  protected previousHistoryPage(): void {
    if (!this.canGoToPreviousHistoryPage()) {
      return;
    }

    this.historyPage.update((page) => page - 1);
    this.reloadHistory();
  }

  protected nextHistoryPage(): void {
    if (!this.canGoToNextHistoryPage()) {
      return;
    }

    this.historyPage.update((page) => page + 1);
    this.reloadHistory();
  }

  protected previousAttentionPage(): void {
    if (!this.canGoToPreviousAttentionPage()) return;
    this.attentionPage.update((page) => page - 1);
    this.reloadAttention();
  }

  protected nextAttentionPage(): void {
    if (!this.canGoToNextAttentionPage()) return;
    this.attentionPage.update((page) => page + 1);
    this.reloadAttention();
  }

  protected serviceLabel(reservation: ReservationResponse): string {
    return `${reservation.serviceName} · ${reservation.durationMinutes} min`;
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: BUSINESS_TIME_ZONE,
    }).format(new Date(value));
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BUSINESS_TIME_ZONE,
    }).format(new Date(value));
  }

  protected statusLabel(status: ReservationStatus): string {
    return reservationStatusLabel(status);
  }

  protected statusTone(status: ReservationStatus) {
    return reservationStatusTone(status);
  }

  protected attentionLabel(reason: AttentionReason): string {
    switch (reason) {
      case 'APPROVAL_REQUIRED':
        return 'Approval required';
      case 'OUTCOME_REQUIRED':
        return 'Outcome required';
      case 'PAYMENT_DUE':
        return 'Payment due';
    }
  }

  protected attentionTone(reason: AttentionReason) {
    return reason === 'PAYMENT_DUE'
      ? ('warning' as const)
      : ('danger' as const);
  }

  protected formatBalance(item: ReservationAttention): string {
    return formatMoney({
      amountCents: item.paymentSummary.balanceDueCents,
      currency: item.paymentSummary.currency,
    });
  }

  protected reservationCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'booking' : 'bookings'}`;
  }

  protected calendarDayAriaLabel(day: CalendarDay | AgendaGroup): string {
    const workload = day.capacityKnown
      ? `, ${day.workloadPercent} percent booked`
      : '';

    return `${this.formatLongDate(day.key)}, ${this.reservationCountLabel(day.count)}, ${day.availabilityLabel}${workload}`;
  }

  protected intervalTop(startMinutes: number): number {
    return this.schedulePosition(startMinutes);
  }

  protected intervalHeight(startMinutes: number, endMinutes: number): number {
    const top = this.schedulePosition(startMinutes);
    const bottom = this.schedulePosition(endMinutes);

    return Math.max(bottom - top, 0);
  }

  protected reservationTop(reservation: ReservationResponse): number {
    return this.intervalTop(this.minutesInBusinessDay(reservation.startsAt));
  }

  protected reservationHeight(reservation: ReservationResponse): number {
    return this.intervalHeight(
      this.minutesInBusinessDay(reservation.startsAt),
      this.minutesInBusinessDay(reservation.endsAt),
    );
  }

  protected reservationAriaLabel(reservation: ReservationResponse): string {
    return `${this.formatTime(reservation.startsAt)} to ${this.formatTime(reservation.endsAt)}, ${reservation.customer.name}, ${reservation.serviceName}, ${this.statusLabel(reservation.status)}`;
  }

  private getMonthGridRange(key: string): { startKey: string; endKey: string } {
    const date = this.utcDateFromKey(key);
    const firstOfMonth = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12),
    );
    const firstOfMonthKey = firstOfMonth.toISOString().slice(0, 10);
    const startKey = this.startOfWeekKey(firstOfMonthKey);
    const endKey = this.addDays(startKey, 41);
    return { startKey, endKey };
  }

  private addMonths(key: string, months: number): string {
    const date = this.utcDateFromKey(key);
    const currentDay = date.getUTCDate();
    date.setUTCMonth(date.getUTCMonth() + months);
    if (date.getUTCDate() !== currentDay) {
      date.setUTCDate(0);
    }
    return date.toISOString().slice(0, 10);
  }

  private reloadCalendar(force = false): void {
    const { startKey, endKey } = this.getMonthGridRange(this.selectedDateKey());
    const calendarStart = this.zonedDateTimeIso(startKey);
    const calendarEnd = this.zonedDateTimeIso(this.addDays(endKey, 1));

    const needsCalendarReload =
      force ||
      !this.loadedFrom ||
      !this.loadedTo ||
      startKey < this.loadedFrom ||
      endKey > this.loadedTo;

    if (needsCalendarReload) {
      this.loadingCalendar.set(true);
      this.reloadAvailability(startKey);
    }
    this.error.set(null);

    if (!needsCalendarReload) return;

    this.api
      .list({
        statuses: ['PENDING', 'CONFIRMED'],
        from: calendarStart,
        to: calendarEnd,
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: calendarPageSize,
      })
      .subscribe({
        next: (page) => {
          this.calendarReservations.set(page.items);
          this.loadedFrom = startKey;
          this.loadedTo = endKey;
          this.loadingCalendar.set(false);
        },
        error: () => {
          this.error.set('Could not load current reservations.');
          this.loadingCalendar.set(false);
        },
      });
  }

  private reloadAvailability(startKey: string): void {
    this.loadingAvailability.set(true);
    this.availabilityError.set(null);

    forkJoin({
      rules: this.availabilityApi.listRules(),
      blocks: this.availabilityApi.listBlocks(
        this.zonedDateTimeIso(this.addDays(startKey, -1)),
      ),
    }).subscribe({
      next: ({ rules, blocks }) => {
        this.availabilityRules.set(rules);
        this.availabilityBlocks.set(blocks);
        this.availabilityReady.set(true);
        this.loadingAvailability.set(false);
      },
      error: () => {
        this.availabilityRules.set([]);
        this.availabilityBlocks.set([]);
        this.availabilityReady.set(false);
        this.availabilityError.set(
          'Availability could not be loaded. Reservation times are still shown.',
        );
        this.loadingAvailability.set(false);
      },
    });
  }

  private reloadAttention(): void {
    this.loadingAttention.set(true);
    this.error.set(null);
    this.api.attention(this.attentionPage(), attentionPageSize).subscribe({
      next: (page) => {
        this.attention.set(page.items);
        this.attentionTotal.set(page.total);
        this.loadingAttention.set(false);
      },
      error: () => {
        this.error.set('Could not load reservations that need attention.');
        this.loadingAttention.set(false);
      },
    });
  }

  private reloadHistory(): void {
    this.loadingHistory.set(true);
    this.error.set(null);

    this.api
      .list({
        ...this.historyListParams(),
        sort: 'STARTS_AT_DESC',
        page: this.historyPage(),
        size: historyPageSize,
      })
      .subscribe({
        next: (page) => {
          this.history.set(page.items);
          this.historyTotal.set(page.total);
          this.loadingHistory.set(false);
        },
        error: () => {
          this.error.set('Could not load reservation history.');
          this.loadingHistory.set(false);
        },
      });
  }

  private historyListParams() {
    const now = new Date().toISOString();

    switch (this.historyFilter()) {
      case 'rejected':
        return { statuses: ['REJECTED'] as const };
      case 'cancelled':
        return { statuses: ['CANCELLED'] as const };
      case 'completed':
        return { statuses: ['COMPLETED'] as const };
      case 'no_show':
        return { statuses: ['NO_SHOW'] as const };
      case 'past_confirmed':
        return { statuses: ['CONFIRMED'] as const, to: now };
      default:
        return { historyBefore: now };
    }
  }

  private visibleWeekReservations(): ReservationResponse[] {
    const from = this.calendarStartKey();
    const to = this.calendarEndKey();

    return this.calendarReservations().filter((reservation) => {
      const key = this.dateKey(reservation.startsAt);
      return key >= from && key <= to;
    });
  }

  private reservationsForDay(key: string): ReservationResponse[] {
    return this.calendarReservations().filter(
      (reservation) => this.dateKey(reservation.startsAt) === key,
    );
  }

  private dayCapacity(
    key: string,
    reservations: ReservationResponse[],
  ): Pick<
    CalendarDay,
    'capacityKnown' | 'workloadPercent' | 'availabilityLabel'
  > {
    if (!this.availabilityReady()) {
      return {
        capacityKnown: false,
        workloadPercent: 0,
        availabilityLabel: 'Availability unavailable',
      };
    }

    const availability = this.availabilityIntervalsForDay(key);
    if (availability.length === 0) {
      return {
        capacityKnown: true,
        workloadPercent: 0,
        availabilityLabel:
          reservations.length > 0 ? 'Outside working hours' : 'Closed',
      };
    }

    const blocks = this.blockIntervalsForDay(key);
    const workingMinutes = availability.reduce(
      (total, interval) => total + interval.endMinutes - interval.startMinutes,
      0,
    );
    const blockedMinutes = blocks.reduce(
      (total, block) =>
        total +
        availability.reduce(
          (overlap, interval) =>
            overlap +
            Math.max(
              0,
              Math.min(block.endMinutes, interval.endMinutes) -
                Math.max(block.startMinutes, interval.startMinutes),
            ),
          0,
        ),
      0,
    );
    const capacityMinutes = Math.max(workingMinutes - blockedMinutes, 0);
    const bookedMinutes = reservations.reduce(
      (total, reservation) => total + reservation.durationMinutes,
      0,
    );

    return {
      capacityKnown: true,
      workloadPercent:
        capacityMinutes === 0
          ? 0
          : Math.min(Math.round((bookedMinutes / capacityMinutes) * 100), 100),
      availabilityLabel:
        capacityMinutes === 0
          ? reservations.length > 0
            ? 'Overbooked'
            : 'Blocked'
          : 'Open',
    };
  }

  private availabilityIntervalsForDay(key: string): CalendarInterval[] {
    if (!this.availabilityReady()) {
      return [];
    }

    const dayOfWeek = this.dayOfWeekCode(key);

    return this.availabilityRules()
      .filter((rule) => rule.dayOfWeek === dayOfWeek)
      .map((rule) => ({
        startMinutes: this.clockMinutes(rule.startTime),
        endMinutes: this.clockMinutes(rule.endTime),
        label: 'Available',
      }))
      .sort((left, right) => left.startMinutes - right.startMinutes);
  }

  private blockIntervalsForDay(key: string): CalendarInterval[] {
    if (!this.availabilityReady()) {
      return [];
    }

    const dayStart = new Date(this.zonedDateTimeIso(key)).getTime();
    const dayEnd = new Date(
      this.zonedDateTimeIso(this.addDays(key, 1)),
    ).getTime();

    return this.availabilityBlocks()
      .filter((block) => {
        const start = new Date(block.startTime).getTime();
        const end = new Date(block.endTime).getTime();
        return start < dayEnd && end > dayStart;
      })
      .map((block) => {
        const start = new Date(block.startTime).getTime();
        const end = new Date(block.endTime).getTime();

        return {
          startMinutes:
            start <= dayStart ? 0 : this.minutesInBusinessDay(block.startTime),
          endMinutes:
            end >= dayEnd ? 24 * 60 : this.minutesInBusinessDay(block.endTime),
          label: block.reason?.trim() || 'Blocked',
        };
      });
  }

  private schedulePosition(minutes: number): number {
    const start = this.scheduleStartMinutes();
    const end = this.scheduleEndMinutes();
    const clamped = Math.min(Math.max(minutes, start), end);

    return ((clamped - start) / Math.max(end - start, 60)) * 100;
  }

  private clockMinutes(value: string): number {
    const [hours = 0, minutes = 0] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesInBusinessDay(value: string): number {
    const parts = this.zonedParts(new Date(value));
    return parts.hour * 60 + parts.minute;
  }

  private formatClockMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const remainder = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  }

  private dayOfWeekCode(key: string): AvailabilityRule['dayOfWeek'] {
    return [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ][this.utcDateFromKey(key).getUTCDay()];
  }

  private dateKey(value: string | Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
    }).formatToParts(value instanceof Date ? value : new Date(value));
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  private formatDateGroupLabel(key: string): string {
    const today = this.dateKey(new Date().toISOString());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = this.dateKey(tomorrow.toISOString());

    if (key === today) {
      return 'Today';
    }

    if (key === tomorrowKey) {
      return 'Tomorrow';
    }

    if (key === this.addDays(today, -1)) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      weekday: 'long',
    }).format(this.utcDateFromKey(key));
  }

  private formatShortDate(key: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(this.utcDateFromKey(key));
  }

  protected formatLongDate(key: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
      weekday: 'long',
    }).format(this.utcDateFromKey(key));
  }

  private formatWeekday(key: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      weekday: 'short',
    }).format(this.utcDateFromKey(key));
  }

  protected formatDayNumber(key: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      timeZone: 'UTC',
    }).format(this.utcDateFromKey(key));
  }

  private startOfWeekKey(key: string): string {
    const date = this.utcDateFromKey(key);
    const day = date.getUTCDay() || 7;

    return this.addDays(key, 1 - day);
  }

  private addDays(key: string, days: number): string {
    const date = this.utcDateFromKey(key);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
  }

  private utcDateFromKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  private zonedDateTimeIso(key: string): string {
    const [year, month, day] = key.split('-').map(Number);
    const wanted = Date.UTC(year, month - 1, day, 0, 0, 0);
    let utcTime = wanted;

    for (let index = 0; index < 3; index += 1) {
      const parts = this.zonedParts(new Date(utcTime));
      const actual = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      );

      utcTime += wanted - actual;
    }

    return new Date(utcTime).toISOString();
  }

  private zonedParts(date: Date): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
    }).formatToParts(date);
    const partValue = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);

    return {
      year: partValue('year'),
      month: partValue('month'),
      day: partValue('day'),
      hour: partValue('hour'),
      minute: partValue('minute'),
      second: partValue('second'),
    };
  }
}
