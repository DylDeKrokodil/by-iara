export type SlotPeriod = 'morning' | 'afternoon' | 'evening';

const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 20;

export function slotPeriod(hour: number): SlotPeriod {
  if (hour < AFTERNOON_START_HOUR) {
    return 'morning';
  }

  return hour < EVENING_START_HOUR ? 'afternoon' : 'evening';
}
