import { describe, expect, it } from 'vitest';
import { slotPeriod } from './booking-period';

describe('slotPeriod', () => {
  it('shows evening only from 8 PM onward', () => {
    expect(slotPeriod(19)).toBe('afternoon');
    expect(slotPeriod(20)).toBe('evening');
  });

  it('keeps the existing noon boundary between morning and afternoon', () => {
    expect(slotPeriod(11)).toBe('morning');
    expect(slotPeriod(12)).toBe('afternoon');
  });
});
