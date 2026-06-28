import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  DEFAULT_LOCALE,
  getLocaleByPath,
  isLocalePath,
  SUPPORTED_LOCALES,
} from './supported-locales';
import type {
  LocalePath,
  PublicPagePath,
  SupportedLocale,
} from './supported-locales';
import { WEBSITE_MESSAGES } from './website-messages';

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

  localizedLink(page: PublicPagePath = ''): string[] {
    return page ? ['/', this.current().path, page] : ['/', this.current().path];
  }

  switchLocaleLink(path: LocalePath): string[] {
    return ['/', path, ...this.currentPathWithoutLocale()];
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
