import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_LOCALE } from '../i18n/supported-locales';
import { LanguageService } from '../i18n/language.service';
import type { Service } from '../services/services-api';
import { SeoService } from './seo.service';
import { SITE_ORIGIN } from './site-origin';

const SERVICE: Service = {
  id: 'service-1',
  slug: 'massagem-de-relaxamento',
  name: 'Massagem de relaxamento',
  description: 'Descrição em português.',
  active: true,
  sortOrder: 1,
  featured: true,
  image: null,
  translations: {
    'pt-PT': {
      slug: 'massagem-de-relaxamento',
      name: 'Massagem de relaxamento',
      description: 'Descrição em português.',
      treatmentDescription: null,
      suitableFor: null,
      sessionDescription: null,
      faqs: [],
    },
    'en-US': {
      slug: 'relaxation-massage',
      name: 'Relaxation massage',
      description: 'English description.',
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
      price: { amountCents: 4000, currency: 'EUR' },
      active: true,
      sortOrder: 1,
    },
  ],
};

describe('SeoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        SeoService,
        { provide: SITE_ORIGIN, useValue: 'https://iaragouveia.com' },
        {
          provide: LanguageService,
          useValue: {
            current: () => DEFAULT_LOCALE,
          },
        },
      ],
    });
  });

  it('uses the explicit route locale for service metadata during SSR initialization', () => {
    const document = TestBed.inject(DOCUMENT);

    TestBed.inject(SeoService).updateService(SERVICE, 'en');

    expect(document.title).toBe(
      'Relaxation massage in Almada | Iara Gouveia',
    );
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.content,
    ).toBe('English description.');
    expect(
      document.head.querySelector<HTMLMetaElement>(
        'meta[property="og:locale"]',
      )?.content,
    ).toBe('en_US');
    expect(
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.href,
    ).toBe('https://iaragouveia.com/en/services/relaxation-massage');

    const structuredData = JSON.parse(
      document.head.querySelector<HTMLScriptElement>(
        'script[data-byiara-seo="structured-data"]',
      )?.textContent ?? '{}',
    ) as { '@graph'?: Array<Record<string, unknown>> };
    expect(structuredData['@graph']?.[0]).toMatchObject({
      name: 'Relaxation massage',
      description: 'English description.',
      inLanguage: 'en-US',
      url: 'https://iaragouveia.com/en/services/relaxation-massage',
    });
    expect(structuredData['@graph']?.[1]).toMatchObject({
      itemListElement: [
        expect.objectContaining({ name: 'Home' }),
        expect.objectContaining({ name: 'Services' }),
        expect.objectContaining({ name: 'Relaxation massage' }),
      ],
    });
  });
});
