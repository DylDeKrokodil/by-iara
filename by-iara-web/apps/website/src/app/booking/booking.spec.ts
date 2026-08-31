import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOCALE } from '../i18n/supported-locales';
import { LanguageService } from '../i18n/language.service';
import { WEBSITE_MESSAGES } from '../i18n/website-messages';
import type { Service } from '../services/services-api';
import { ServicesApi } from '../services/services-api';
import { Booking } from './booking';
import { BookingApi } from './booking-api';

const SERVICE: Service = {
  id: 'service-1',
  slug: 'massagem-de-relaxamento',
  name: 'Massagem de relaxamento',
  description: null,
  active: true,
  sortOrder: 1,
  featured: true,
  image: null,
  translations: {
    'pt-PT': {
      slug: 'massagem-de-relaxamento',
      name: 'Massagem de relaxamento',
      description: null,
      treatmentDescription: null,
      suitableFor: null,
      sessionDescription: null,
      faqs: [],
    },
  },
  variants: [
    {
      id: 'variant-1',
      durationMinutes: 60,
      price: { amountCents: 5000, currency: 'EUR' },
      active: true,
      sortOrder: 1,
    },
  ],
};

describe('Booking SSR', () => {
  it('renders the booking flow after loading public services on the server', async () => {
    const services = new Subject<Service[]>();
    const availableSlots = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Booking],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: LanguageService,
          useValue: {
            current: () => DEFAULT_LOCALE,
            messages: () => WEBSITE_MESSAGES[DEFAULT_LOCALE.locale],
            localizedLink: () => ['/', DEFAULT_LOCALE.path],
          },
        },
        {
          provide: ServicesApi,
          useValue: { list: () => services.asObservable() },
        },
        { provide: BookingApi, useValue: { availableSlots } },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<Booking> = TestBed.createComponent(Booking);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('A carregar...');
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain(
      'Marcar uma sessão',
    );
    expect(
      fixture.nativeElement.querySelector('.eyebrow')?.textContent,
    ).toContain('Atendimento exclusivo a mulheres');
    expect(fixture.nativeElement.querySelector('.spinner')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.booking-loading'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(
      'Não existem serviços disponíveis',
    );

    services.next([SERVICE]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain(
      'Marcar uma sessão',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Não existem serviços disponíveis',
    );
    expect(availableSlots).not.toHaveBeenCalled();
  });
});
