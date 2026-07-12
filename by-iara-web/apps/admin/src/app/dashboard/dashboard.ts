import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from '@by-iara/shared-ui';
import { forkJoin } from 'rxjs';
import { AvailabilityApi } from '../availability/availability-api';
import {
  AvailabilityBlock,
  AvailabilityRule,
} from '../availability/availability.models';
import { formatMoney } from '../services/service.models';
import {
  ReservationResponse,
  reservationStatusLabel,
  reservationStatusTone,
} from '../reservations/reservation.models';
import { ReservationsApi } from '../reservations/reservations-api';

const businessTimeZone = 'Europe/Brussels';
const dashboardPageSize = 100;

interface UpcomingDay {
  key: string;
  label: string;
  count: number;
}

@Component({
  selector: 'byiara-dashboard',
  imports: [Alert, Button, Card, EmptyState, PageHeader, StatusChip],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly reservationsApi = inject(ReservationsApi);
  private readonly availabilityApi = inject(AvailabilityApi);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pending = signal<ReservationResponse[]>([]);
  protected readonly pendingTotal = signal(0);
  protected readonly todayReservations = signal<ReservationResponse[]>([]);
  protected readonly weekReservations = signal<ReservationResponse[]>([]);
  protected readonly rules = signal<AvailabilityRule[]>([]);
  protected readonly blocks = signal<AvailabilityBlock[]>([]);
  protected readonly formatMoney = formatMoney;

  protected readonly todayKey = this.dateKey(new Date());
  protected readonly todayLabel = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeZone: businessTimeZone,
  }).format(new Date());

  protected readonly nextReservation = computed(() => {
    const now = Date.now();
    return this.todayReservations().find(
      (reservation) => new Date(reservation.startsAt).getTime() >= now,
    ) ?? null;
  });

  protected readonly upcomingDays = computed<UpcomingDay[]>(() => {
    const counts = new Map<string, number>();
    for (const reservation of this.weekReservations()) {
      const key = this.dateKey(new Date(reservation.startsAt));
      if (key !== this.todayKey) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, 4)
      .map(([key, count]) => ({
        key,
        count,
        label: this.formatUpcomingDay(key),
      }));
  });

  protected readonly todayHasAvailability = computed(() => {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: businessTimeZone,
      weekday: 'long',
    }).format(new Date()).toUpperCase();
    return this.rules().some((rule) => rule.dayOfWeek === weekday);
  });

  protected readonly nextBlock = computed(() => this.blocks()[0] ?? null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected reload(): void {
    this.loadDashboard();
  }

  protected statusLabel(reservation: ReservationResponse): string {
    return reservationStatusLabel(reservation.status);
  }

  protected statusTone(reservation: ReservationResponse) {
    return reservationStatusTone(reservation.status);
  }

  protected serviceLabel(reservation: ReservationResponse): string {
    return `${reservation.serviceName} · ${reservation.durationMinutes} min`;
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: businessTimeZone,
    }).format(new Date(value));
  }

  protected formatBlock(block: AvailabilityBlock): string {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    const sameDay = this.dateKey(start) === this.dateKey(end);
    const startText = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: businessTimeZone,
      ...(sameDay ? {} : { year: 'numeric' as const }),
    }).format(start);
    return `${startText}, ${this.formatTime(block.startTime)}–${this.formatTime(block.endTime)}`;
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    const todayStart = this.zonedDateTimeIso(this.todayKey);
    const tomorrowStart = this.zonedDateTimeIso(this.addDays(this.todayKey, 1));
    const weekEnd = this.zonedDateTimeIso(this.addDays(this.todayKey, 8));

    forkJoin({
      pending: this.reservationsApi.list({
        statuses: ['PENDING'],
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: 5,
      }),
      today: this.reservationsApi.list({
        statuses: ['CONFIRMED'],
        from: todayStart,
        to: tomorrowStart,
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: dashboardPageSize,
      }),
      week: this.reservationsApi.list({
        statuses: ['CONFIRMED'],
        from: todayStart,
        to: weekEnd,
        sort: 'STARTS_AT_ASC',
        page: 0,
        size: dashboardPageSize,
      }),
      rules: this.availabilityApi.listRules(),
      blocks: this.availabilityApi.listBlocks(new Date().toISOString()),
    }).subscribe({
      next: ({ pending, today, week, rules, blocks }) => {
        this.pending.set(pending.items);
        this.pendingTotal.set(pending.total);
        this.todayReservations.set(today.items);
        this.weekReservations.set(week.items);
        this.rules.set(rules);
        this.blocks.set(
          [...blocks].sort((left, right) => left.startTime.localeCompare(right.startTime)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load today’s operations.');
        this.loading.set(false);
      },
    });
  }

  private formatUpcomingDay(key: string): string {
    const date = new Date(`${key}T12:00:00Z`);
    const tomorrowKey = this.addDays(this.todayKey, 1);
    if (key === tomorrowKey) return 'Tomorrow';

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      weekday: 'long',
    }).format(date);
  }

  private dateKey(value: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: businessTimeZone,
      year: 'numeric',
    }).formatToParts(value);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  private addDays(key: string, days: number): string {
    const date = new Date(`${key}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
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

  private zonedParts(date: Date) {
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
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    return {
      year: value('year'),
      month: value('month'),
      day: value('day'),
      hour: value('hour'),
      minute: value('minute'),
      second: value('second'),
    };
  }
}
