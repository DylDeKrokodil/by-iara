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

  private readonly heroVideo =
    viewChild<ElementRef<HTMLVideoElement>>('heroVideo');

  constructor() {
    afterNextRender(() => {
      const video = this.heroVideo()?.nativeElement;
      if (!video) return;

      const motionPreference = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      );
      const lifecycleEvents = new AbortController();
      this.heroVideoPlaybackEnabled = !motionPreference.matches;
      video.muted = true;
      video.defaultMuted = true;
      const synchronizePlayback = () => {
        if (
          this.heroVideoPlaybackEnabled &&
          this.heroVideoShouldPlay &&
          document.visibilityState === 'visible'
        ) {
          this.playHeroVideo(video);
        } else {
          video.pause();
        }
      };
      motionPreference.addEventListener(
        'change',
        () => {
          this.heroVideoPlaybackEnabled = !motionPreference.matches;
          synchronizePlayback();
        },
        { signal: lifecycleEvents.signal },
      );
      document.addEventListener('visibilitychange', synchronizePlayback, {
        signal: lifecycleEvents.signal,
      });
      window.addEventListener('pageshow', synchronizePlayback, {
        signal: lifecycleEvents.signal,
      });
      synchronizePlayback();
      // Hydrated video elements can miss the initial autoplay opportunity in
      // Safari. Retry once after media metadata and layout have settled.
      window.setTimeout(synchronizePlayback, 250);
      this.destroyRef.onDestroy(() => {
        this.heroVideoPlaybackEnabled = false;
        video.pause();
        this.headerAppearance.setMovingMediaBehindHeader(false);
        lifecycleEvents.abort();
      });
    });
  }

  private heroVideoPlaybackEnabled = false;
  private heroVideoShouldPlay = true;

  protected toggleHeroPlayback(): void {
    const video = this.heroVideo()?.nativeElement;
    if (!video) return;
    this.heroVideoPlaybackEnabled = !this.heroVideoPlaying();
    if (this.heroVideoPlaybackEnabled) this.playHeroVideo(video);
    else video.pause();
  }

  protected onHeroVideoPlaying(): void {
    // A preference or visibility change can race an outstanding play promise.
    if (!this.heroVideoPlaybackEnabled || !this.heroVideoShouldPlay) {
      this.heroVideo()?.nativeElement.pause();
      return;
    }
    this.setHeroVideoPlaying(true);
  }

  protected onHeroVideoPause(): void {
    this.setHeroVideoPlaying(false);
  }

  private playHeroVideo(video: HTMLVideoElement): void {
    video.muted = true;
    video.defaultMuted = true;
    void video
      .play()
      .then(() => {
        if (
          !this.heroVideoPlaybackEnabled ||
          !this.heroVideoShouldPlay ||
          document.visibilityState !== 'visible'
        ) {
          video.pause();
          return;
        }
        this.setHeroVideoPlaying(!video.paused);
      })
      .catch(() => {
        // Keep the still and an explicit play action when autoplay is unavailable.
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
