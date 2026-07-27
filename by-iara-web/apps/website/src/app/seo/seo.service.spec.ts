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
  image: {
    url: '/api/services/service-1/image?v=1',
    width: 1600,
    height: 1200,
    byteSize: 180000,
  },
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

    expect(document.title).toBe('Relaxation massage in Almada | Iara Gouveia');
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.content,
    ).toBe('English description.');
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[property="og:locale"]')
        ?.content,
    ).toBe('en_US');
    expect(
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.href,
    ).toBe('https://iaragouveia.com/en/services/relaxation-massage');
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')
        ?.content,
    ).toBe('https://iaragouveia.com/api/services/service-1/image?v=1');
    expect(
      document.head.querySelector<HTMLMetaElement>(
        'meta[property="og:image:alt"]',
      )?.content,
    ).toBe('Relaxation massage');

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
      image: expect.objectContaining({
        url: 'https://iaragouveia.com/api/services/service-1/image?v=1',
        caption: 'Relaxation massage',
      }),
    });
    expect(structuredData['@graph']?.[1]).toMatchObject({
      itemListElement: [
        expect.objectContaining({ name: 'Home' }),
        expect.objectContaining({ name: 'Services' }),
        expect.objectContaining({ name: 'Relaxation massage' }),
      ],
    });
  });

  it('keeps public utility pages crawlable while excluding them from search results', () => {
    const document = TestBed.inject(DOCUMENT);

    TestBed.inject(SeoService).updateStaticRoute('/pt/privacidade');

    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
        ?.content,
    ).toBe('noindex, follow');
  });

  it('does not ask crawlers to follow links on a missing page', () => {
    const document = TestBed.inject(DOCUMENT);

    TestBed.inject(SeoService).updateStaticRoute('/pt/nao-existe');

    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
        ?.content,
    ).toBe('noindex, nofollow');
  });

  it('publishes consistent local business details on the home page', () => {
    const document = TestBed.inject(DOCUMENT);

    TestBed.inject(SeoService).updateStaticRoute('/pt');

    const structuredData = JSON.parse(
      document.head.querySelector<HTMLScriptElement>(
        'script[data-byiara-seo="structured-data"]',
      )?.textContent ?? '{}',
    ) as { '@graph'?: Array<Record<string, unknown>> };
    expect(structuredData['@graph']?.[0]).toMatchObject({
      '@type': 'LocalBusiness',
      name: 'Iara Gouveia',
      email: 'info@iaragouveia.com',
      telephone: '+351 934 596 852',
      address: expect.objectContaining({
        addressLocality: 'Almada',
        addressCountry: 'PT',
      }),
    });
  });

  it('keeps catalogue list positions consecutive when a translation is unavailable', () => {
    const document = TestBed.inject(DOCUMENT);
    const untranslatedService: Service = {
      ...SERVICE,
      id: 'service-without-portuguese',
      translations: {
        'en-US': SERVICE.translations['en-US'],
      },
    };

    TestBed.inject(SeoService).updateCatalogStructuredData([
      untranslatedService,
      SERVICE,
    ]);

    const structuredData = JSON.parse(
      document.head.querySelector<HTMLScriptElement>(
        'script[data-byiara-seo="structured-data"]',
      )?.textContent ?? '{}',
    ) as { itemListElement?: Array<Record<string, unknown>> };
    expect(structuredData.itemListElement).toEqual([
      expect.objectContaining({
        position: 1,
        name: 'Massagem de relaxamento',
      }),
    ]);
  });
});
