import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    const openGraphUrl = document.head.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    )?.content;

    if (openGraphUrl) {
      try {
        return new URL(openGraphUrl).origin;
      } catch {
        // Fall back to the browser origin if server-rendered metadata is
        // malformed or unavailable.
      }
    }

    return document.location.origin;
  },
});
