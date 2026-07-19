import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ServicesApi } from '../services/services-api';
import type { Service } from '../services/service.models';
import { Packs } from './packs';
import { CustomerPack, PacksApi } from './packs-api';

const service: Service = {
  id: 'service-1',
  slug: 'relaxation-massage',
  name: 'Relaxation massage',
  description: null,
  active: true,
  featured: true,
  image: null,
  sortOrder: 0,
  translations: {},
  variants: [],
  packOffers: [
    {
      id: 'offer-1',
      durationMinutes: 60,
      sessionCount: 4,
      price: { amountCents: 22_000, currency: 'EUR' },
      validityDays: 180,
      active: true,
      sortOrder: 0,
    },
  ],
};

const customerPack: CustomerPack = {
  id: 'pack-1',
  customerName: 'Ana Silva',
  customerEmail: 'ana@example.com',
  status: 'ACTIVE',
  serviceName: 'Relaxation massage',
  durationMinutes: 60,
  totalSessions: 4,
  remainingSessions: 3,
  priceCents: 22_000,
  currency: 'EUR',
  activatedAt: '2026-07-01T10:00:00Z',
  expiresAt: '2026-12-28T10:00:00Z',
  originatingReservationId: 'reservation-1',
};

describe('Packs', () => {
  let fixture: ComponentFixture<Packs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Packs],
      providers: [
        provideRouter([]),
        { provide: ServicesApi, useValue: { list: () => of([service]) } },
        { provide: PacksApi, useValue: { list: () => of([customerPack]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Packs);
    fixture.detectChanges();
  });

  it('shows pack offers by default and switches to customer packs', () => {
    const element = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(
      element.querySelectorAll<HTMLButtonElement>('byiara-tabs button'),
    );

    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(element.textContent).toContain('Relaxation massage');
    expect(element.textContent).not.toContain('Ana Silva');

    tabs[1].click();
    fixture.detectChanges();

    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(element.textContent).toContain('Ana Silva');
    expect(element.textContent).not.toContain('Pack price');
  });
});
