import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Booking } from './booking';
import { AutomaticPrice, BookingApi, DiscountQuote } from './booking-api';
import { ServicesApi, Service } from '../services/services-api';

const service: Service = {
  id: 'service',
  slug: 'massage',
  name: 'Massage',
  active: true,
  sortOrder: 0,
  featured: false,
  description: null,
  image: null,
  translations: {
    'pt-PT': {
      slug: 'massage',
      name: 'Massage',
      description: null,
      treatmentDescription: null,
      suitableFor: null,
      sessionDescription: null,
      faqs: [],
    },
  },
  variants: [
    {
      id: 'variant',
      durationMinutes: 60,
      active: true,
      sortOrder: 0,
      price: { amountCents: 5000, currency: 'EUR' },
      promotionalPrice: { amountCents: 4000, currency: 'EUR' },
      promotion: {
        name: 'Welcome',
        serviceIds: ['service'],
        valueType: 'PERCENTAGE',
        valueAmount: 2000,
        currency: null,
        endsAt: '2099-01-01',
        firstTimeCustomersOnly: true,
        maxUsesPerCustomer: 1,
      },
    },
  ],
};
const price = (cents: number): AutomaticPrice => ({
  originalPrice: { amountCents: 5000, currency: 'EUR' },
  finalPrice: { amountCents: cents, currency: 'EUR' },
});

async function setup() {
  vi.useFakeTimers();
  const automaticPrice = vi.fn(() => new Subject<AutomaticPrice>());
  const previewDiscount = vi.fn(() => new Subject<DiscountQuote>());
  await TestBed.configureTestingModule({
    imports: [Booking],
    providers: [
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: ServicesApi, useValue: { list: () => of([service]) } },
      {
        provide: BookingApi,
        useValue: {
          availableSlots: () => of([]),
          automaticPrice,
          previewDiscount,
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Booking);
  fixture.detectChanges();
  return {
    fixture,
    component: fixture.componentInstance,
    automaticPrice,
    previewDiscount,
  };
}

afterEach(() => {
  vi.useRealTimers();
  TestBed.resetTestingModule();
});

describe('Automatic booking pricing', () => {
  it('shows the crossed-out price and first-time eligibility on step one', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('s')?.textContent).toContain(
      '50',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Apenas para novos clientes.',
    );
  });

  it('cancels stale email checks and uses the new eligible price', async () => {
    const { fixture, component, automaticPrice } = await setup();
    component['form'].controls.email.setValue('first@example.com');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(350);
    const first = automaticPrice.mock.results[0].value;
    component['form'].controls.email.setValue('returning@example.com');
    fixture.detectChanges();
    expect(component['priceReady']()).toBe(false);
    await vi.advanceTimersByTimeAsync(350);
    automaticPrice.mock.results[1].value.next(price(5000));
    first.next(price(4000));
    fixture.detectChanges();
    expect(component['sessionPrice'](service.variants[0])).toBe(5000);
    expect(component['offerUnavailable']()).toBe(true);
    expect(fixture.nativeElement.querySelector('.option-chip s')).toBeNull();
    expect(component['priceReady']()).toBe(true);
  });

  it('keeps review blocked on a failed price check and supports retry', async () => {
    const { fixture, component, automaticPrice } = await setup();
    component['form'].controls.email.setValue('new@example.com');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(350);
    automaticPrice.mock.results[0].value.error(new Error('offline'));
    fixture.detectChanges();
    expect(component['priceReady']()).toBe(false);
    expect(component['priceFailed']()).toBe(true);
    component['retryPrice']();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(350);
    automaticPrice.mock.results[1].value.next(price(4000));
    fixture.detectChanges();
    expect(component['priceReady']()).toBe(true);
  });

  it('ignores a code preview that completes after changing email', async () => {
    const { fixture, component, previewDiscount } = await setup();
    component['form'].patchValue({
      email: 'first@example.com',
      discountCode: 'SAVE',
    });
    fixture.detectChanges();
    component['applyDiscount']();
    component['form'].controls.email.setValue('second@example.com');
    fixture.detectChanges();
    previewDiscount.mock.results[0].value.next({
      ...price(3000),
      discountAmount: { amountCents: 2000, currency: 'EUR' },
    });
    expect(component['appliedDiscountCode']()).toBeNull();
  });
});
