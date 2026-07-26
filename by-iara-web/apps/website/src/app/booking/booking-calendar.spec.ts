import {
  bookingCalendarMonth,
  selectedOrFirstAvailableDateKey,
} from './booking-calendar';

describe('bookingCalendarMonth', () => {
  it('returns the complete requested month', () => {
    const month = bookingCalendarMonth(new Date(2026, 6, 18, 23, 30), 1);

    expect(month.firstDay).toEqual(new Date(2026, 7, 1));
    expect(month.lastDay).toEqual(new Date(2026, 7, 31));
    expect(month.gridDayCount).toBe(42);
  });

  it('starts the calendar grid on Monday', () => {
    const month = bookingCalendarMonth(new Date(2026, 6, 18), 0);

    expect(month.gridStart).toEqual(new Date(2026, 5, 29));
    expect(month.gridStart.getDay()).toBe(1);
    expect(month.gridDayCount).toBe(35);
  });
});

describe('selectedOrFirstAvailableDateKey', () => {
  const availableDateKeys = ['2026-08-03', '2026-08-04', '2026-08-05'];

  it('selects the first available date when no date is selected', () => {
    expect(selectedOrFirstAvailableDateKey(availableDateKeys, null)).toBe(
      '2026-08-03',
    );
  });

  it('keeps an explicitly selected date while it remains available', () => {
    expect(
      selectedOrFirstAvailableDateKey(availableDateKeys, '2026-08-05'),
    ).toBe('2026-08-05');
  });

  it('falls back to the first available date when selection expires', () => {
    expect(
      selectedOrFirstAvailableDateKey(availableDateKeys, '2026-08-09'),
    ).toBe('2026-08-03');
  });

  it('returns null when no dates are available', () => {
    expect(selectedOrFirstAvailableDateKey([], null)).toBeNull();
  });
});
