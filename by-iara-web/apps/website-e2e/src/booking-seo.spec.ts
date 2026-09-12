import { expect, test } from '@playwright/test';

const BOOKING_ROUTES = [
  {
    requestPath: '/pt/marcar?service=massagem-de-relaxamento&variant=variant-1',
    canonicalPath: '/pt/marcar',
    alternatePath: '/en/book',
    language: 'pt-PT',
    title: 'Marcar uma sessão | Iara Gouveia',
    heading: 'Marcar uma sessão',
  },
  {
    requestPath: '/en/book',
    canonicalPath: '/en/book',
    alternatePath: '/pt/marcar',
    language: 'en-US',
    title: 'Book a massage session | Iara Gouveia',
    heading: 'Book a session',
  },
] as const;

function linkHref(html: string, selector: string): string | undefined {
  return html.match(
    new RegExp(`<link[^>]+${selector}[^>]+href="([^"]+)"`),
  )?.[1];
}

test('serves localized, indexable booking metadata in the SSR response', async ({
  request,
}) => {
  for (const route of BOOKING_ROUTES) {
    const response = await request.get(route.requestPath);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const canonical = linkHref(html, 'rel="canonical"');
    const alternate = linkHref(
      html,
      `rel="alternate" hreflang="${route.language === 'pt-PT' ? 'en' : 'pt-PT'}"`,
    );

    expect(html).toContain(`<html lang="${route.language}"`);
    expect(html).toContain(`<title>${route.title}</title>`);
    expect(html).toContain(
      '<meta name="robots" content="index, follow, max-image-preview:large">',
    );
    expect(new URL(canonical ?? 'http://invalid').pathname).toBe(
      route.canonicalPath,
    );
    expect(new URL(canonical ?? 'http://invalid').search).toBe('');
    expect(new URL(alternate ?? 'http://invalid').pathname).toBe(
      route.alternatePath,
    );
    expect(html).toContain(`<h1`);
    expect(html).toContain(`>${route.heading}</h1>`);
    expect(html).toContain('class="booking-flow"');
    expect(html).not.toContain('class="booking-loading');
  }
});

test('publishes both localized booking canonicals in the sitemap', async ({
  request,
}) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const sitemap = await response.text();

  expect(sitemap).toMatch(/<loc>https?:\/\/[^<]+\/pt\/marcar<\/loc>/);
  expect(sitemap).toMatch(/<loc>https?:\/\/[^<]+\/en\/book<\/loc>/);
  expect(sitemap).toMatch(
    /hreflang="pt-PT" href="https?:\/\/[^"]+\/pt\/marcar"/,
  );
  expect(sitemap).toMatch(/hreflang="en" href="https?:\/\/[^"]+\/en\/book"/);
});
