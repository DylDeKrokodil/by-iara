import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
app.disable('x-powered-by');
const angularApp = new AngularNodeAppEngine();

function publicSiteOrigin(req: express.Request): string {
  return (
    process.env['PUBLIC_SITE_URL'] || `${req.protocol}://${req.get('host')}`
  ).replace(/\/$/, '');
}

function querySuffix(req: express.Request): string {
  const queryStart = req.originalUrl.indexOf('?');
  return queryStart >= 0 ? req.originalUrl.slice(queryStart) : '';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SitemapService {
  readonly updatedAt?: string | null;
  readonly translations: Record<string, { readonly slug: string }>;
}

interface SitemapUrlGroup {
  readonly pt?: string;
  readonly en?: string;
  readonly lastModified?: string;
}

function sitemapLastModified(
  value: string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const PERMANENT_REDIRECTS: Readonly<Record<string, string>> = {
  '/': '/pt',
  '/pt/book': '/pt/marcar',
  '/pt/privacy': '/pt/privacidade',
  '/pt/booking-terms': '/pt/termos-de-marcacao',
  '/pt/legal-information': '/pt/informacao-legal',
};

Object.entries(PERMANENT_REDIRECTS).forEach(([source, destination]) => {
  app.get(source, (req, res) =>
    res.redirect(301, `${destination}${querySuffix(req)}`),
  );
});

const LEGACY_MASSAGE_PATHS: Readonly<Record<string, string>> = {
  '/pt/servicos': '/pt/massagens',
  '/pt/services': '/pt/massagens',
  '/en/services': '/en/massages',
};

Object.entries(LEGACY_MASSAGE_PATHS).forEach(([source, destination]) => {
  app.get(source, (req, res) =>
    res.redirect(301, `${destination}${querySuffix(req)}`),
  );
  app.get(`${source}/:slug`, (req, res) =>
    res.redirect(
      301,
      `${destination}/${encodeURIComponent(req.params['slug'])}${querySuffix(req)}`,
    ),
  );
});

app.get('/robots.txt', (req, res) => {
  res
    .set('Cache-Control', 'public, max-age=3600')
    .type('text/plain')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        `Sitemap: ${publicSiteOrigin(req)}/sitemap.xml`,
        '',
      ].join('\n'),
    );
});

app.get('/sitemap.xml', async (req, res) => {
  const origin = publicSiteOrigin(req);
  const apiOrigin = process.env['API_PROXY_TARGET'] || 'http://localhost:8080';
  let services: SitemapService[] = [];
  try {
    const response = await fetch(
      `${apiOrigin.replace(/\/$/, '')}/api/services`,
    );
    if (response.ok) {
      services = (await response.json()) as SitemapService[];
    }
  } catch (error) {
    console.error('Sitemap catalog fetch failed:', error);
  }

  const staticGroups: SitemapUrlGroup[] = [
    { pt: '/pt', en: '/en' },
    { pt: '/pt/massagens', en: '/en/massages' },
    { pt: '/pt/packs', en: '/en/packs' },
  ];
  const serviceGroups: SitemapUrlGroup[] = services.map((service) => ({
    pt: service.translations['pt-PT']?.slug
      ? `/pt/massagens/${encodeURIComponent(service.translations['pt-PT'].slug)}`
      : undefined,
    en: service.translations['en-US']?.slug
      ? `/en/massages/${encodeURIComponent(service.translations['en-US'].slug)}`
      : undefined,
    lastModified: sitemapLastModified(service.updatedAt),
  }));
  const groups = [...staticGroups, ...serviceGroups];
  const urls = groups.flatMap((group) =>
    (['pt', 'en'] as const).flatMap((locale) => {
      const path = group[locale];
      if (!path) {
        return [];
      }
      const alternates = (['pt', 'en'] as const)
        .flatMap((alternateLocale) => {
          const alternatePath = group[alternateLocale];
          return alternatePath
            ? [
                `<xhtml:link rel="alternate" hreflang="${alternateLocale === 'pt' ? 'pt-PT' : 'en'}" href="${escapeXml(origin + alternatePath)}" />`,
              ]
            : [];
        })
        .join('');
      const xDefault = group.pt
        ? `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(origin + group.pt)}" />`
        : '';
      const lastModified = group.lastModified
        ? `<lastmod>${group.lastModified}</lastmod>`
        : '';
      return [
        `<url><loc>${escapeXml(origin + path)}</loc>${lastModified}${alternates}${xDefault}</url>`,
      ];
    }),
  );

  res
    .set('Cache-Control', 'public, max-age=300')
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">` +
        urls.join('') +
        `</urlset>`,
    );
});

/**
 * Security headers for the public site. script-src keeps 'unsafe-inline' because
 * Angular SSR hydration emits inline scripts (ng-event-dispatch-contract + the
 * bootstrap block); the public site holds no credentials, so this is an acceptable
 * baseline. Tightening to a nonce-based script-src is a follow-up.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Proxy API requests to the backend API container
 */
app.use('/api/admin', (_req, res) => {
  res.sendStatus(404);
});

app.use('/api/**', (req, res) => {
  const target = process.env['API_PROXY_TARGET'] || 'http://localhost:8080';
  const targetUrl = new URL(req.originalUrl, target);

  const proxyReq = http.request(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      if (proxyRes.statusCode) {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
      }
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on('error', (err) => {
    console.error('API proxy error:', err);
    res.status(502).send('Bad Gateway');
  });

  req.pipe(proxyReq, { end: true });
});

/**
 * Apply security headers to all app responses (static assets + rendered HTML).
 * Registered after the API proxy so proxied API traffic is left untouched.
 */
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
