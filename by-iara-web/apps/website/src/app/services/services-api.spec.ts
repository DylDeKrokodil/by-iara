import { describe, expect, it } from 'vitest';
import {
  applyAutomaticPromotions,
  type AutomaticPromotion,
  type Service,
} from './services-api';

const service: Service = {
  id: 'service-1',
  slug: 'massage',
  name: 'Massage',
  description: null,
  active: true,
  sortOrder: 0,
  featured: true,
  image: null,
  translations: {},
  variants: [
    {
      id: 'variant-1',
      durationMinutes: 60,
      price: { amountCents: 8000, currency: 'EUR' },
      active: true,
      sortOrder: 0,
    },
  ],
};

describe('applyAutomaticPromotions', () => {
  it('uses the best applicable promotion without changing the base price', () => {
    const promotions: AutomaticPromotion[] = [
      {
        name: 'Ten percent',
        serviceIds: ['service-1'],
        valueType: 'PERCENTAGE',
        valueAmount: 1000,
        currency: null,
        endsAt: '2026-10-01T00:00:00Z',
      },
      {
        name: 'Twenty euros',
        serviceIds: ['service-1'],
        valueType: 'FIXED_AMOUNT',
        valueAmount: 2000,
        currency: 'EUR',
        endsAt: '2026-10-01T00:00:00Z',
      },
    ];

    const [priced] = applyAutomaticPromotions([service], promotions);

    expect(priced.variants[0].price.amountCents).toBe(8000);
    expect(priced.variants[0].promotionalPrice?.amountCents).toBe(6000);
  });

  it('ignores promotions for another service', () => {
    const [priced] = applyAutomaticPromotions(
      [service],
      [
        {
          name: 'Other service',
          serviceIds: ['service-2'],
          valueType: 'PERCENTAGE',
          valueAmount: 5000,
          currency: null,
          endsAt: '2026-10-01T00:00:00Z',
        },
      ],
    );

    expect(priced.variants[0].promotionalPrice).toBeUndefined();
  });
});
