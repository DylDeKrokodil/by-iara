import { bookingCalendarMonth } from './booking-calendar';

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
