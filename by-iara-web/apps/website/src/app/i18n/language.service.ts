import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  DEFAULT_LOCALE,
  getLocalizedPagePath,
  getLocaleByPath,
  isLocalePath,
  localizePublicPageSegments,
  SUPPORTED_LOCALES,
} from './supported-locales';
import type {
  LocaleCode,
  LocalePath,
  PublicPageKey,
  SupportedLocale,
} from './supported-locales';
import { WEBSITE_MESSAGES } from './website-messages';

interface ResolvedLocalizedService {
  readonly translations: Partial<Record<LocaleCode, { readonly slug: string }>>;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  readonly locales = SUPPORTED_LOCALES;
  readonly current = signal<SupportedLocale>(DEFAULT_LOCALE);
  readonly messages = computed(() => WEBSITE_MESSAGES[this.current().locale]);

  constructor() {
    this.syncFromUrl(this.router.url);

    effect(() => {
      this.document.documentElement.lang = this.current().locale;
    });

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => this.syncFromUrl(event.urlAfterRedirects));
  }

  localizedLink(page: PublicPageKey = 'home', ...segments: string[]): string[] {
    const pagePath = getLocalizedPagePath(this.current().path, page);
    return pagePath
      ? ['/', this.current().path, pagePath, ...segments]
      : ['/', this.current().path, ...segments];
  }

  switchLocaleLink(path: LocalePath): string[] {
    const currentSegments = this.currentPathWithoutLocale();
    const localizedSegments = localizePublicPageSegments(
      this.current().path,
      path,
      currentSegments,
    );

    if (currentSegments.length > 1) {
      const targetLocale = getLocaleByPath(path);
      const targetSlug = targetLocale
        ? this.currentResolvedResource()?.translations[targetLocale.locale]
            ?.slug
        : undefined;
      return targetSlug
        ? ['/', path, localizedSegments[0], targetSlug]
        : ['/', path, localizedSegments[0]];
    }

    return ['/', path, ...localizedSegments];
  }

  private currentResolvedResource(): ResolvedLocalizedService | null {
    let snapshot = this.router.routerState.snapshot.root;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    return (
      (snapshot.data['service'] as ResolvedLocalizedService | null) ??
      (snapshot.data['guide'] as ResolvedLocalizedService | null) ??
      null
    );
  }

  private currentPathWithoutLocale(): readonly string[] {
    const segments = this.primarySegments(this.router.url);
    return isLocalePath(segments[0]) ? segments.slice(1) : segments;
  }

  private syncFromUrl(url: string): void {
    const locale = getLocaleByPath(this.primarySegments(url)[0]);
    this.current.set(locale ?? DEFAULT_LOCALE);
  }

  private primarySegments(url: string): readonly string[] {
    const tree = this.router.parseUrl(url);
    return (
      tree.root.children[PRIMARY_OUTLET]?.segments.map(
        (segment) => segment.path,
      ) ?? []
    );
  }
}
