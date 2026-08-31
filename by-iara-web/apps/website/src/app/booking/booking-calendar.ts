export interface BookingCalendarMonth {
  readonly firstDay: Date;
  readonly lastDay: Date;
  readonly gridStart: Date;
  readonly gridDayCount: number;
}

/** Builds a Monday-first calendar month without carrying the current time. */
export function bookingCalendarMonth(
  referenceDate: Date,
  monthOffset: number,
): BookingCalendarMonth {
  const firstDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + monthOffset,
    1,
  );
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
  const gridStart = new Date(firstDay);
  const daysAfterMonday = (firstDay.getDay() + 6) % 7;
  gridStart.setDate(gridStart.getDate() - daysAfterMonday);
  const daysBeforeSunday = (7 - lastDay.getDay()) % 7;
  const gridDayCount = daysAfterMonday + lastDay.getDate() + daysBeforeSunday;

  return { firstDay, lastDay, gridStart, gridDayCount };
}

export function selectedOrFirstAvailableDateKey(
  availableDateKeys: ReadonlyArray<string>,
  selectedDateKey: string | null,
): string | null {
  if (
    selectedDateKey &&
    availableDateKeys.some((dateKey) => dateKey === selectedDateKey)
  ) {
    return selectedDateKey;
  }

  return availableDateKeys[0] ?? null;
}
