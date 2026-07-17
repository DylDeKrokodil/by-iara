import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  SUPPORTED_LOCALES,
  getLocalizedPagePath,
  getPublicPageKey,
} from '../i18n/supported-locales';
import type {
  LocaleCode,
  LocalePath,
  PublicPageKey,
} from '../i18n/supported-locales';
import { LanguageService } from '../i18n/language.service';
import type { Service } from '../services/services-api';
import { SEO_MESSAGES, StaticSeoPage } from './seo-messages';
import { SITE_ORIGIN } from './site-origin';
import { BRAND } from '../brand/brand';

const HREFLANG: Record<LocalePath, string> = { pt: 'pt-PT', en: 'en' };
const OG_LOCALE: Record<LocaleCode, string> = {
  'pt-PT': 'pt_PT',
  'en-US': 'en_US',
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly siteOrigin = inject(SITE_ORIGIN).replace(/\/$/, '');

  updateStaticRoute(url: string): void {
    const segments = this.primarySegments(url);
    if (segments.length > 2) {
      return;
    }

    const locale = this.language.current();
    const page = getPublicPageKey(locale.path, segments[1]);
    if (page) {
      this.updateStatic(page);
      return;
    }

    this.updateNotFound(segments.join('/'));
  }

  updateService(service: Service | null): void {
    const locale = this.language.current();
    const translation = service?.translations[locale.locale];
    if (!service || !translation) {
      this.updateNotFound(this.router.url.replace(/^\//, ''));
      return;
    }

    const title = `${translation.name} em Almada | ${BRAND.name}`;
    const description =
      translation.description ??
      SEO_MESSAGES[locale.locale].services.description;
    const canonicalPath = this.servicePath(locale.path, translation.slug);
    const alternates = SUPPORTED_LOCALES.flatMap((candidate) => {
      const localized = service.translations[candidate.locale];
      return localized
        ? [
            {
              locale: candidate.path,
              path: this.servicePath(candidate.path, localized.slug),
            },
          ]
        : [];
    });

    this.apply({
      title,
      description,
      canonicalPath,
      alternates,
      indexable: true,
      type: 'product',
    });
    this.setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: translation.name,
      description,
      url: this.absolute(canonicalPath),
      inLanguage: locale.locale,
      areaServed: { '@type': 'City', name: 'Almada' },
      provider: {
        '@type': 'Organization',
        '@id': `${this.siteOrigin}/#organization`,
        name: BRAND.name,
        url: `${this.siteOrigin}/pt`,
      },
      offers: service.variants
        .filter((variant) => variant.active)
        .map((variant) => ({
          '@type': 'Offer',
          price: (variant.price.amountCents / 100).toFixed(2),
          priceCurrency: variant.price.currency,
          url: `${this.absolute(this.staticPath(locale.path, 'book'))}?service=${encodeURIComponent(service.slug)}&variant=${encodeURIComponent(variant.id)}`,
        })),
    });
  }

  updateCatalogStructuredData(services: readonly Service[]): void {
    const locale = this.language.current();
    const items = services.flatMap((service, index) => {
      const translation = service.translations[locale.locale];
      return translation
        ? [
            {
              '@type': 'ListItem',
              position: index + 1,
              name: translation.name,
              url: this.absolute(
                this.servicePath(locale.path, translation.slug),
              ),
            },
          ]
        : [];
    });
    this.setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: items,
    });
  }

  private updateStatic(page: PublicPageKey): void {
    const locale = this.language.current();
    const seo = SEO_MESSAGES[locale.locale][page as StaticSeoPage];
    const indexable = page !== 'book';
    const canonicalPath = this.staticPath(locale.path, page);
    const alternates = SUPPORTED_LOCALES.map((candidate) => ({
      locale: candidate.path,
      path: this.staticPath(candidate.path, page),
    }));

    this.apply({
      title: seo.title,
      description: seo.description,
      canonicalPath,
      alternates,
      indexable,
      type: 'website',
    });

    if (page === 'home') {
      this.setStructuredData({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${this.siteOrigin}/#organization`,
            name: BRAND.name,
            url: `${this.siteOrigin}/pt`,
            logo: `${this.siteOrigin}/${BRAND.logoPath}`,
          },
          {
            '@type': 'WebSite',
            '@id': `${this.siteOrigin}/#website`,
            name: BRAND.name,
            url: `${this.siteOrigin}/pt`,
            inLanguage: ['pt-PT', 'en-US'],
            publisher: { '@id': `${this.siteOrigin}/#organization` },
          },
        ],
      });
    }
  }

  private updateNotFound(path: string): void {
    const locale = this.language.current();
    const seo = SEO_MESSAGES[locale.locale].notFound;
    this.apply({
      title: seo.title,
      description: seo.description,
      canonicalPath: `/${path}`,
      alternates: [],
      indexable: false,
      type: 'website',
    });
  }

  private apply(config: {
    title: string;
    description: string;
    canonicalPath: string;
    alternates: ReadonlyArray<{ locale: LocalePath; path: string }>;
    indexable: boolean;
    type: 'website' | 'product';
  }): void {
    const canonical = this.absolute(config.canonicalPath);
    const locale = this.language.current();
    this.title.setTitle(config.title);
    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({
      name: 'robots',
      content: config.indexable
        ? 'index, follow, max-image-preview:large'
        : 'noindex, nofollow',
    });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({
      property: 'og:description',
      content: config.description,
    });
    this.meta.updateTag({ property: 'og:type', content: config.type });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:site_name', content: BRAND.name });
    this.meta.updateTag({
      property: 'og:locale',
      content: OG_LOCALE[locale.locale],
    });
    this.meta.updateTag({
      property: 'og:image',
      content: `${this.siteOrigin}/hero/hero-treatment-mixkit-4744.jpg`,
    });
    this.meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({
      name: 'twitter:description',
      content: config.description,
    });
    this.meta.updateTag({
      name: 'twitter:image',
      content: `${this.siteOrigin}/hero/hero-treatment-mixkit-4744.jpg`,
    });

    this.document.head
      .querySelectorAll('link[data-byiara-seo]')
      .forEach((element) => element.remove());
    this.addLink({ rel: 'canonical', href: canonical });
    config.alternates.forEach((alternate) =>
      this.addLink({
        rel: 'alternate',
        hreflang: HREFLANG[alternate.locale],
        href: this.absolute(alternate.path),
      }),
    );
    const portuguese = config.alternates.find(
      (alternate) => alternate.locale === 'pt',
    );
    if (portuguese) {
      this.addLink({
        rel: 'alternate',
        hreflang: 'x-default',
        href: this.absolute(portuguese.path),
      });
    }

    this.removeStructuredData();
  }

  private setStructuredData(value: unknown): void {
    this.removeStructuredData();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-byiara-seo', 'structured-data');
    script.textContent = JSON.stringify(value).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }

  private removeStructuredData(): void {
    this.document.head
      .querySelectorAll('script[data-byiara-seo="structured-data"]')
      .forEach((element) => element.remove());
  }

  private addLink(attributes: Record<string, string>): void {
    const link = this.document.createElement('link');
    link.setAttribute('data-byiara-seo', 'link');
    Object.entries(attributes).forEach(([name, value]) =>
      link.setAttribute(name, value),
    );
    this.document.head.appendChild(link);
  }

  private staticPath(locale: LocalePath, page: PublicPageKey): string {
    const pagePath = getLocalizedPagePath(locale, page);
    return pagePath ? `/${locale}/${pagePath}` : `/${locale}`;
  }

  private servicePath(locale: LocalePath, slug: string): string {
    return `${this.staticPath(locale, 'services')}/${encodeURIComponent(slug)}`;
  }

  private absolute(path: string): string {
    return `${this.siteOrigin}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private primarySegments(url: string): readonly string[] {
    const tree = this.router.parseUrl(url);
    return (
      tree.root.children['primary']?.segments.map((segment) => segment.path) ??
      []
    );
  }
}
