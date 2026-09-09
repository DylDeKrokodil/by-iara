import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';
import {
  Service,
  ServicesApi,
  ServiceTranslation,
  localizedService,
} from '../services/services-api';
import { NextAvailableLink } from './next-available-link/next-available-link';
import { featuredServices } from './featured-services';
import { packPresentations } from '../packs/pack-presentation';
import { HeaderAppearanceService } from '../header-appearance.service';
import { HomePack } from './home-pack/home-pack';
import { RevealOnScroll } from './reveal-on-scroll.directive';

@Component({
  selector: 'byiara-home',
  imports: [Button, HomePack, NextAvailableLink, RevealOnScroll, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  protected readonly language = inject(LanguageService);
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly headerAppearance = inject(HeaderAppearanceService);

  protected readonly copy = computed(() => this.language.messages().home);
  protected readonly heroVideoPlaying = signal(false);

  private readonly services = signal<Service[]>([]);
  /** Admin-controlled selection; the section renders only when this is non-empty. */
  protected readonly taster = computed(() =>
    featuredServices(this.services(), this.language.current().locale),
  );
  protected readonly featuredPack = computed(() => {
    const featuredIds = new Set(this.taster().map((service) => service.id));
    const offers = packPresentations(this.services());
    return (
      offers.find((item) => featuredIds.has(item.service.id)) ??
      offers[0] ??
      null
    );
  });

  private readonly heroSection =
    viewChild<ElementRef<HTMLElement>>('heroSection');
  private readonly heroVideo =
    viewChild<ElementRef<HTMLVideoElement>>('heroVideo');

  constructor() {
    // Browser-only: the `muted` content attribute alone doesn't reliably
    // satisfy autoplay policies once Angular re-creates the element, so set
    // the property and kick playback explicitly. The video stays hidden until
    // playback really starts, preventing Safari's native play overlay from
    // appearing when autoplay is unavailable.
    afterNextRender(() => {
      const hero = this.heroSection()?.nativeElement;
      const video = this.heroVideo()?.nativeElement;
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      this.heroVideoPlaybackEnabled = !reduceMotion;

      if (video) {
        if (reduceMotion) {
          video.removeAttribute('autoplay');
          video.pause();
        } else {
          this.playHeroVideo(video);
        }
      }

      if (!hero) {
        return;
      }
      this.headerAppearance.setMovingMediaBehindHeader(!reduceMotion);
      // Stop compositing the looping video while it is offscreen. Entries
      // batch on fast scroll reversals, so only the last one is current.
      const observer = new IntersectionObserver((entries) => {
        const visible = entries[entries.length - 1].isIntersecting;
        this.heroVideoShouldPlay = visible;
        this.headerAppearance.setMovingMediaBehindHeader(
          visible && this.heroVideoPlaying(),
        );

        if (!video || reduceMotion) {
          return;
        }
        if (visible) {
          this.playHeroVideo(video);
        } else {
          video.pause();
        }
      });
      observer.observe(hero);

      const lifecycleEvents = new AbortController();
      const resumePlayback = () => {
        if (
          video &&
          this.heroVideoPlaybackEnabled &&
          this.heroVideoShouldPlay &&
          document.visibilityState === 'visible'
        ) {
          this.playHeroVideo(video);
        }
      };
      document.addEventListener('visibilitychange', resumePlayback, {
        signal: lifecycleEvents.signal,
      });
      window.addEventListener('pageshow', resumePlayback, {
        signal: lifecycleEvents.signal,
      });
      this.destroyRef.onDestroy(() => {
        this.headerAppearance.setMovingMediaBehindHeader(false);
        observer.disconnect();
        lifecycleEvents.abort();
      });
    });
  }

  private heroVideoPlaybackEnabled = false;
  private heroVideoShouldPlay = true;

  protected onHeroVideoPlaying(): void {
    this.setHeroVideoPlaying(true);
  }

  protected onHeroVideoPause(): void {
    this.setHeroVideoPlaying(false);

    const video = this.heroVideo()?.nativeElement;
    if (
      video &&
      this.heroVideoPlaybackEnabled &&
      this.heroVideoShouldPlay &&
      document.visibilityState === 'visible'
    ) {
      this.playHeroVideo(video);
    }
  }

  private playHeroVideo(video: HTMLVideoElement): void {
    video.muted = true;
    video.defaultMuted = true;
    void video
      .play()
      .then(() => {
        // Autoplay can begin before Angular hydrates and subscribes to the
        // `playing` event. Synchronize the signal from the play result too so
        // an already-playing video is not left hidden behind its poster.
        if (
          !video.paused &&
          this.heroVideoPlaybackEnabled &&
          this.heroVideoShouldPlay &&
          document.visibilityState === 'visible'
        ) {
          this.setHeroVideoPlaying(true);
        }
      })
      .catch(() => {
        // Browser policy or Low Power Mode blocked autoplay. Keep the matching
        // still image visible rather than exposing native video controls.
        this.setHeroVideoPlaying(false);
      });
  }

  private setHeroVideoPlaying(playing: boolean): void {
    this.heroVideoPlaying.set(playing);
    this.headerAppearance.setMovingMediaBehindHeader(
      playing && this.heroVideoShouldPlay,
    );
  }

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (data) => this.services.set(data),
      error: () => this.services.set([]),
    });
  }

  protected localized(service: Service): ServiceTranslation {
    return localizedService(service, this.language.current().locale);
  }

  protected detailLink(service: Service): string[] {
    return this.language.localizedLink(
      'services',
      this.localized(service).slug,
    );
  }

  protected priceFrom(service: Service): string {
    const variant = this.cheapestVariant(service);
    const cents = variant?.price.amountCents ?? 0;
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }

  protected promotionalPriceFrom(service: Service): string | null {
    const cents = this.cheapestVariant(service)?.promotionalPrice?.amountCents;
    if (cents === undefined) return null;
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  }

  private cheapestVariant(service: Service) {
    return service.variants
      .filter((variant) => variant.active)
      .reduce<
        (typeof service.variants)[number] | null
      >((current, variant) => (!current || (variant.promotionalPrice?.amountCents ?? variant.price.amountCents) < (current.promotionalPrice?.amountCents ?? current.price.amountCents) ? variant : current), null);
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
    this.router.navigate(this.language.localizedLink('book'), {
      queryParams: { service: service.slug },
    });
  }
}
