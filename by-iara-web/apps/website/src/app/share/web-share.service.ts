import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { SITE_ORIGIN } from '../seo/site-origin';

export interface ShareContent {
  readonly title: string;
  readonly text?: string;
  readonly url?: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';
export type SharePlatform = 'facebook';

@Injectable({ providedIn: 'root' })
export class WebShareService {
  private readonly document = inject(DOCUMENT);
  private readonly siteOrigin = inject(SITE_ORIGIN).replace(/\/$/, '');

  async share(content: ShareContent): Promise<ShareResult> {
    const browserWindow = this.document.defaultView;
    if (!browserWindow) return 'unavailable';

    const url = content.url ?? this.shareableUrl();
    const shareData: ShareData = {
      title: content.title,
      text: content.text,
      url,
    };

    if (!this.nativeShareAvailable()) return 'unavailable';

    try {
      await browserWindow.navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      return 'unavailable';
    }
  }

  nativeShareAvailable(): boolean {
    return (
      typeof this.document.defaultView?.navigator.share === 'function'
    );
  }

  platformLink(
    platform: SharePlatform,
    content: ShareContent,
  ): string {
    const url = content.url ?? this.shareableUrl();

    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          url,
        )}`;
    }
  }

  async copyLink(url = this.shareableUrl()): Promise<ShareResult> {
    return (await this.copyUrl(url)) ? 'copied' : 'unavailable';
  }

  private shareableUrl(): string {
    const canonical = this.document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    )?.href;
    if (canonical) return canonical;

    const location =
      this.document.defaultView?.location ?? this.document.location;
    return new URL(
      `${location.pathname}${location.search}`,
      this.siteOrigin,
    ).href;
  }

  private async copyUrl(url: string): Promise<boolean> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (clipboard) {
      try {
        await clipboard.writeText(url);
        return true;
      } catch {
        // Continue to the legacy fallback for browsers or contexts that deny
        // asynchronous clipboard access.
      }
    }

    const body = this.document.body;
    if (!body || typeof this.document.execCommand !== 'function') return false;

    const input = this.document.createElement('textarea');
    input.value = url;
    input.readOnly = true;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    body.append(input);
    input.select();

    try {
      return this.document.execCommand('copy');
    } catch {
      return false;
    } finally {
      input.remove();
    }
  }
}
