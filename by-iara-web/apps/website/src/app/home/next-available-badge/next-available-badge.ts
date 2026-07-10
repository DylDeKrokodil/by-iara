import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingApi, BUSINESS_TIMEZONE } from '../../booking/booking-api';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'byiara-next-available-badge',
  imports: [RouterLink],
  templateUrl: './next-available-badge.html',
  styleUrl: './next-available-badge.css',
})
export class NextAvailableBadge {
  private readonly bookingApi = inject(BookingApi);
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().home);

  private readonly nextSlot = signal<string | null>(null);

  protected readonly label = computed(() => {
    const iso = this.nextSlot();
    if (!iso) {
      return null;
    }

    const slotDate = new Date(iso);
    const locale = this.language.current().locale;
    const time = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BUSINESS_TIMEZONE,
    }).format(slotDate);

    const day = this.isSameBusinessDay(slotDate, new Date())
      ? this.copy().today
      : new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          timeZone: BUSINESS_TIMEZONE,
        }).format(slotDate);

    return this.copy().nextAvailable(day, time);
  });

  constructor() {
    this.bookingApi.nextAvailable().subscribe({
      next: (iso) => this.nextSlot.set(iso),
      error: () => this.nextSlot.set(null),
    });
  }

  /** Same calendar day in the business timezone, regardless of the visitor's own. */
  private isSameBusinessDay(a: Date, b: Date): boolean {
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format;
    return format(a) === format(b);
  }
}
