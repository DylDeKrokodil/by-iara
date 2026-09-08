import { describe, expect, it } from 'vitest';
import { promotionDisclaimer } from './promotion-copy';

describe('Promotion eligibility copy', () => {
  it('distinguishes first-time eligibility from once-per-promotion usage', () => {
    expect(promotionDisclaimer({ maxUsesPerCustomer: 1 }, 'en')).not.toContain(
      'First-time',
    );
    expect(
      promotionDisclaimer({ firstTimeCustomersOnly: true }, 'en'),
    ).toContain('First-time');
    expect(promotionDisclaimer({ maxUsesPerCustomer: null }, 'en')).toBe('');
    expect(
      promotionDisclaimer(
        { firstTimeCustomersOnly: true, maxUsesPerCustomer: 1 },
        'pt',
      ),
    ).toContain('Uma utilização por cliente');
  });
});
