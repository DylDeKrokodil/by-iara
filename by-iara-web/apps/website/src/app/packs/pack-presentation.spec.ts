import { describe, expect, it } from 'vitest';
import type { Service } from '../services/services-api';
import { packPresentations } from './pack-presentation';

function service(): Service {
  return {
    id: 'relaxation',
    slug: 'relaxation',
    name: 'Relaxation',
    description: null,
    active: true,
    sortOrder: 0,
    featured: true,
    translations: {},
    variants: [
      {
        id: 'sixty',
        durationMinutes: 60,
        price: { amountCents: 4000, currency: 'EUR' },
        active: true,
        sortOrder: 0,
      },
    ],
    packOffers: [
      {
        id: 'four-pack',
        durationMinutes: 60,
        sessionCount: 4,
        price: { amountCents: 14000, currency: 'EUR' },
        validityDays: 120,
        active: true,
        sortOrder: 0,
      },
    ],
  };
}

describe('packPresentations', () => {
  it('derives the regular value, saving, and price per session', () => {
    const [item] = packPresentations([service()]);

    expect(item.regularTotalCents).toBe(16000);
    expect(item.savingCents).toBe(2000);
    expect(item.perSessionCents).toBe(3500);
  });

  it('does not advertise an offer without a matching active duration', () => {
    const unavailable = service();
    unavailable.variants[0].active = false;

    expect(packPresentations([unavailable])).toEqual([]);
  });
});
