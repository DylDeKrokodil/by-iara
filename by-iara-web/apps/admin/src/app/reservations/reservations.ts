import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { forkJoin, Observable } from 'rxjs';
import { formatMoney } from '../services/service.models';
import {
  ReservationPage,
  ReservationResponse,
  ReservationStatus,
  reservationStatusLabel,
  reservationStatusTone,
} from './reservation.models';
import { ReservationsApi } from './reservations-api';

const reservationViewValues = ['overview', 'history'] as const;
type ReservationView = (typeof reservationViewValues)[number];

const reservationTabs: ReadonlyArray<TabOption> = [
  { label: 'Overview', value: 'overview' },
  { label: 'History', value: 'history' },
];

const historyFilterValues = [
  'all',
  'rejected',
  'cancelled',
  'completed',
  'past_confirmed',
] as const;

type HistoryFilter = (typeof historyFilterValues)[number];

const historyFilters: ReadonlyArray<SelectFieldOption> = [
  { label: 'All history', value: 'all' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Completed', value: 'completed' },
  { label: 'Past confirmed', value: 'past_confirmed' },
];

const reservationColumns: ReadonlyArray<DataTableColumn> = [
  { key: 'customer', label: 'Customer' },
  { key: 'service', label: 'Service' },
  { key: 'when', label: 'Date & Time' },
  { key: 'status', label: 'Status', fit: true },
  { key: 'notes', label: 'Notes' },
];

const historyPageSize = 10;
const sectionPageSize = 50;
const calendarPageSize = 250;
const businessTimeZone = 'Europe/Brussels';

interface AgendaGroup {
  key: string;
  label: string;
  heading: string;
  isSelected: boolean;
  isToday: boolean;
  reservations: ReservationResponse[];
}

interface CalendarDay {
  key: string;
  weekday: string;
  day: string;
  count: number;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth?: boolean;
  reservations?: ReservationResponse[];
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
    Card,
    DataTable,
    EmptyState,
    PageHeader,
    SelectField,
    StatusChip,
    Tabs,
  ],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class Reservations implements OnInit {
  private readonly api = inject(ReservationsApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly activeView = signal<ReservationView>('overview');
  protected readonly selectedDateKey = signal(this.dateKey(new Date()));
  protected readonly calendarView = signal<'day' | 'week' | 'month'>('week');
  protected readonly pending = signal<ReservationResponse[]>([]);
  /** Set from ?id= when arriving via the "new reservation" admin email link. */
  protected readonly highlightId = signal<string | null>(null);
  private hasScrolledToHighlight = false;
  protected readonly calendarReservations = signal<ReservationResponse[]>([]);
  protected readonly nextConfirmed = signal<ReservationResponse | null>(null);
  protected readonly history = signal<ReservationResponse[]>([]);

  private loadedFrom: string | null = null;
  private loadedTo: string | null = null;

  protected readonly pendingTotal = signal(0);
  protected readonly calendarTotal = signal(0);
  protected readonly thisWeekTotal = signal(0);
  protected readonly closedTotal = signal(0);
  protected readonly loadingPending = signal(false);
  protected readonly loadingCalendar = signal(false);
  protected readonly loadingHistory = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly historyFilter = signal<HistoryFilter>('all');
  protected readonly historyPage = signal(0);
  protected readonly historyTotal = signal(0);

  protected readonly reservationTabs = reservationTabs;
  protected readonly reservationColumns = reservationColumns;
  protected readonly historyFilters = historyFilters;
  protected readonly formatMoney = formatMoney;

  protected readonly todayKey = computed(() => this.dateKey(new Date()));
  protected readonly nextReservation = computed(() => this.nextConfirmed());
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

    return this.calendarDays().map((day) => ({
      key: day.key,
      label: this.formatDateGroupLabel(day.key),
      heading: this.formatLongDate(day.key),
      isSelected: day.isSelected,
      isToday: day.isToday,
      reservations: reservationsByDay.get(day.key) ?? [],
    }));
  });
  protected readonly monthGridDays = computed<CalendarDay[]>(() => {
    const selectedDate = this.utcDateFromKey(this.selectedDateKey());
    const selectedMonth = selectedDate.getUTCMonth();
    const selectedYear = selectedDate.getUTCFullYear();
    const { startKey } = this.getMonthGridRange(this.selectedDateKey());
    const counts = new Map<string, number>();
    const dailyReservations = new Map<string, ReservationResponse[]>();

    for (const reservation of this.calendarReservations()) {
      const key = this.dateKey(reservation.startsAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      dailyReservations.set(key, [
        ...(dailyReservations.get(key) ?? []),
        reservation,
      ]);
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
        isCurrentMonth: date.getUTCMonth() === selectedMonth && date.getUTCFullYear() === selectedYear,
        reservations: dailyReservations.get(key) ?? [],
      };
    });
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

  constructor() {
    // Runs once the target reservation actually shows up in the loaded pending list
    // (not on every pending() change) -- guards against re-scrolling on later reloads,
    // e.g. after the admin accepts/declines something else in the list.
    effect(() => {
      const id = this.highlightId();
      if (!id || this.hasScrolledToHighlight) {
        return;
      }
      if (this.pending().some((reservation) => reservation.id === id)) {
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
    this.reload();
  }

  protected setActiveView(view: string): void {
    if (!isReservationView(view)) {
      return;
    }

    this.activeView.set(view);
  }

  protected reload(): void {
    this.reloadActiveSections(true);
    this.reloadHistory();
  }

  protected setCalendarView(view: 'day' | 'week' | 'month'): void {
    this.calendarView.set(view);
    this.reloadActiveSections();
  }

  protected previousCalendarPeriod(): void {
    if (this.calendarView() === 'day') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), -1));
    } else if (this.calendarView() === 'week') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), -7));
    } else if (this.calendarView() === 'month') {
      this.selectedDateKey.set(this.addMonths(this.selectedDateKey(), -1));
    }
    this.reloadActiveSections();
  }

  protected nextCalendarPeriod(): void {
    if (this.calendarView() === 'day') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), 1));
    } else if (this.calendarView() === 'week') {
      this.selectedDateKey.set(this.addDays(this.selectedDateKey(), 7));
    } else if (this.calendarView() === 'month') {
      this.selectedDateKey.set(this.addMonths(this.selectedDateKey(), 1));
    }
    this.reloadActiveSections();
  }

  protected goToToday(): void {
    this.selectedDateKey.set(this.todayKey());
    this.reloadActiveSections();
  }

  protected selectCalendarDay(dayKey: string): void {
    if (dayKey === this.selectedDateKey()) {
      return;
    }

    this.selectedDateKey.set(dayKey);
    this.reloadActiveSections();
  }

  protected selectMonthGridDay(dayKey: string): void {
    this.selectedDateKey.set(dayKey);
    this.calendarView.set('day');
    this.reloadActiveSections();
  }

  protected onDatePickerChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (!value || value === this.selectedDateKey()) {
      return;
    }

    this.selectedDateKey.set(value);
    this.reloadActiveSections();
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

  protected serviceLabel(reservation: ReservationResponse): string {
    return `${reservation.serviceName} · ${reservation.durationMinutes} min`;
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Brussels',
    }).format(new Date(value));
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Brussels',
    }).format(new Date(value));
  }

  protected formatSummaryDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Brussels',
    }).format(new Date(value));
  }

  protected statusLabel(status: ReservationStatus): string {
    return reservationStatusLabel(status);
  }

  protected statusTone(status: ReservationStatus) {
    return reservationStatusTone(status);
  }

  private getMonthGridRange(key: string): { startKey: string; endKey: string } {
    const date = this.utcDateFromKey(key);
    const firstOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
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

  private reloadActiveSections(force = false): void {
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const nextWeek = new Date(nowDate);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { startKey, endKey } = this.getMonthGridRange(this.selectedDateKey());
    const calendarStart = this.zonedDateTimeIso(startKey);
    const calendarEnd = this.zonedDateTimeIso(this.addDays(endKey, 1));

    const needsCalendarReload =
      force ||
      !this.loadedFrom ||
      !this.loadedTo ||
      startKey < this.loadedFrom ||
      endKey > this.loadedTo;

    this.loadingPending.set(true);
    if (needsCalendarReload) {
      this.loadingCalendar.set(true);
    }
    this.error.set(null);

    const apiCalls: {
      pending: Observable<ReservationPage>;
      nextConfirmed: Observable<ReservationPage>;
      thisWeek: Observable<ReservationPage>;
      closed: Observable<ReservationPage>;
      calendar?: Observable<ReservationPage>;
    } = {
      pending: this.api.list({
        statuses: ['PENDING'],
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: sectionPageSize,
      }),
      nextConfirmed: this.api.list({
        statuses: ['CONFIRMED'],
        from: now,
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: 1,
      }),
      thisWeek: this.api.list({
        statuses: ['CONFIRMED'],
        from: now,
        to: nextWeek.toISOString(),
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: 1,
      }),
      closed: this.api.list({
        historyBefore: now,
        sort: 'STARTS_AT_DESC',
        page: 0,
        size: 1,
      }),
    };

    if (needsCalendarReload) {
      apiCalls.calendar = this.api.list({
        statuses: ['CONFIRMED'],
        from: calendarStart,
        to: calendarEnd,
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: calendarPageSize,
      });
    }

    forkJoin(apiCalls).subscribe({
      next: (results) => {
        this.pending.set(results.pending.items);
        this.pendingTotal.set(results.pending.total);
        this.nextConfirmed.set(results.nextConfirmed.items[0] ?? null);
        this.thisWeekTotal.set(results.thisWeek.total);
        this.closedTotal.set(results.closed.total);
        
        if (results.calendar) {
          this.calendarReservations.set(results.calendar.items);
          this.calendarTotal.set(results.calendar.total);
          this.loadedFrom = startKey;
          this.loadedTo = endKey;
          this.loadingCalendar.set(false);
        }
        
        this.loadingPending.set(false);
      },
      error: () => {
        this.error.set('Could not load current reservations.');
        this.loadingPending.set(false);
        this.loadingCalendar.set(false);
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
      case 'past_confirmed':
        return { statuses: ['CONFIRMED'] as const, to: now };
      default:
        return { historyBefore: now };
    }
  }

  private dateKey(value: string | Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: businessTimeZone,
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
      timeZone: businessTimeZone,
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
