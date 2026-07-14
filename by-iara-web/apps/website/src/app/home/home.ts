import {
  Component,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';
import {
  Service,
  ServicesApi,
  ServiceTranslation,
  localizedService,
} from '../services/services-api';
import { NextAvailableBadge } from './next-available-badge/next-available-badge';

const TASTER_SIZE = 3;

@Component({
  selector: 'byiara-home',
  imports: [Button, NextAvailableBadge, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  protected readonly language = inject(LanguageService);
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly copy = computed(() => this.language.messages().home);

  private readonly services = signal<Service[]>([]);
  /** Featured-first taster; the section renders only when this is non-empty. */
  protected readonly taster = computed(() =>
    [...this.services()]
      .filter((service) => service.variants.some((variant) => variant.active))
      .sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder,
      )
      .slice(0, TASTER_SIZE),
  );

  private readonly heroSection =
    viewChild<ElementRef<HTMLElement>>('heroSection');
  private readonly heroVideo =
    viewChild<ElementRef<HTMLVideoElement>>('heroVideo');

  constructor() {
    // Browser-only: the `muted` content attribute alone doesn't reliably
    // satisfy autoplay policies once Angular re-creates the element, so set
    // the property and kick playback explicitly. Reduced-motion visitors get
    // the still photo instead (the video is also hidden via CSS).
    afterNextRender(() => {
      const hero = this.heroSection()?.nativeElement;
      const video = this.heroVideo()?.nativeElement;
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      if (video) {
        if (reduceMotion) {
          video.removeAttribute('autoplay');
          video.pause();
        } else {
          video.muted = true;
          video.play().catch(() => {
            // Autoplay blocked: the still photo underneath stays visible.
          });
        }
      }

      if (!hero) {
        return;
      }
      // Stop compositing the looping video while it is offscreen. Entries
      // batch on fast scroll reversals, so only the last one is current.
      new IntersectionObserver((entries) => {
        const visible = entries[entries.length - 1].isIntersecting;
        if (!video || reduceMotion) {
          return;
        }
        if (visible) {
          video.play().catch(() => {
            // Ignored: the still photo underneath stays visible.
          });
        } else {
          video.pause();
        }
      }).observe(hero);
    });
  }

  ngOnInit(): void {
    // Like the catalog: no relative API fetches during SSR/prerender. The
    // taster section simply stays hidden (also on error) — the home page
    // never shows a loading or error state for it.
    if (isPlatformBrowser(this.platformId)) {
      this.api.list().subscribe({
        next: (data) => this.services.set(data),
        error: () => this.services.set([]),
      });
    }
  }

  protected localized(service: Service): ServiceTranslation {
    return localizedService(service, this.language.current().locale);
  }

  protected priceFrom(service: Service): string {
    const cents = Math.min(
      ...service.variants
        .filter((variant) => variant.active)
        .map((variant) => variant.price.amountCents),
    );
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }

  protected durationLabel(service: Service): string {
    const minutes = service.variants
      .filter((variant) => variant.active)
      .map((variant) => variant.durationMinutes);
    return this.copy().servicesDuration(
      Math.min(...minutes),
      Math.max(...minutes),
    );
  }

  protected onBook(service: Service): void {
    this.router.navigate(['/', this.language.current().path, 'book'], {
      queryParams: { service: service.slug },
    });
  }
}
