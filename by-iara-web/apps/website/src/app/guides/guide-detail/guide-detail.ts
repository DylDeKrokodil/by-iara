import {
  Component,
  DestroyRef,
  ElementRef,
  RESPONSE_INIT,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { simpleFacebook } from '@ng-icons/simple-icons';
import { Button, ToastService } from '@by-iara/shared-ui';
import { LanguageService } from '../../i18n/language.service';
import { LocalePath } from '../../i18n/supported-locales';
import { SeoService } from '../../seo/seo.service';
import {
  SharePlatform,
  WebShareService,
} from '../../share/web-share.service';
import {
  localizedService,
  Service,
  ServicesApi,
} from '../../services/services-api';
import { estimateGuideReadingMinutes } from '../guide-reading-time';
import { Guide, GuideTranslation } from '../guides-api';

@Component({
  selector: 'byiara-guide-detail',
  imports: [Button, NgIcon, RouterLink],
  templateUrl: './guide-detail.html',
  styleUrl: './guide-detail.css',
})
export class GuideDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly route = inject(ActivatedRoute);
  private readonly responseInit = inject(RESPONSE_INIT);
  private readonly seo = inject(SeoService);
  private readonly servicesApi = inject(ServicesApi);
  private readonly toast = inject(ToastService);
  private readonly webShare = inject(WebShareService);

  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(
    () => this.language.messages().guideDetail,
  );
  protected readonly guide = this.route.snapshot.data['guide'] as Guide | null;
  protected readonly translation = computed<GuideTranslation | null>(() =>
    this.guide
      ? (this.guide.translations[this.language.current().locale] ?? null)
      : null,
  );
  protected readonly relatedServices = signal<Service[]>([]);
  protected readonly readingMinutes = computed(() => {
    const translation = this.translation();
    return translation
      ? estimateGuideReadingMinutes(translation)
      : 1;
  });
  protected readonly sharing = signal(false);
  protected readonly canNativeShare = signal(false);
  protected readonly platformIcons = {
    facebook: simpleFacebook,
  };

  constructor() {
    afterNextRender(() => {
      this.canNativeShare.set(this.webShare.nativeShareAvailable());
      this.setupReadingProgress();
    });
    if (!this.guide && this.responseInit) this.responseInit.status = 404;
    const localePath = this.route.parent?.snapshot.data[
      'localePath'
    ] as LocalePath;
    this.seo.updateGuide(this.guide, localePath);
    if (this.guide?.relatedServiceIds.length) {
      const ids = new Set(this.guide.relatedServiceIds);
      this.servicesApi.list().subscribe({
        next: (services) =>
          this.relatedServices.set(
            services.filter(
              (service) =>
                ids.has(service.id) &&
                Boolean(service.translations[this.language.current().locale]),
            ),
          ),
      });
    }
  }

  private setupReadingProgress(): void {
    const document = this.elementRef.nativeElement.ownerDocument;
    const view = document.defaultView;
    if (!view) return;

    const progress =
      this.elementRef.nativeElement.querySelector<HTMLElement>(
        '.reading-progress',
      );
    const scroller = document.scrollingElement;
    const main = this.elementRef.nativeElement.closest<HTMLElement>('main');
    if (!progress || !scroller || !main) return;

    let animationFrame: number | null = null;
    const updateProgress = () => {
      animationFrame = null;
      const mainBottom =
        scroller.scrollTop + main.getBoundingClientRect().bottom;
      const scrollableDistance = mainBottom - scroller.clientHeight;
      const ratio =
        scrollableDistance > 0
          ? Math.min(1, Math.max(0, scroller.scrollTop / scrollableDistance))
          : 1;
      progress.style.setProperty('--reading-progress', String(ratio));
    };
    const scheduleUpdate = () => {
      if (animationFrame === null) {
        animationFrame = view.requestAnimationFrame(updateProgress);
      }
    };

    view.addEventListener('scroll', scheduleUpdate, { passive: true });
    view.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    this.destroyRef.onDestroy(() => {
      view.removeEventListener('scroll', scheduleUpdate);
      view.removeEventListener('resize', scheduleUpdate);
      if (animationFrame !== null) {
        view.cancelAnimationFrame(animationFrame);
      }
    });
  }

  protected serviceName(service: Service): string {
    return localizedService(service, this.language.current().locale).name;
  }

  protected serviceLink(service: Service): string[] {
    return this.language.localizedLink(
      'services',
      localizedService(service, this.language.current().locale).slug,
    );
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.language.current().locale, {
      dateStyle: 'long',
    }).format(new Date(value));
  }

  protected async shareGuide(localized: GuideTranslation): Promise<void> {
    if (this.sharing()) return;

    this.sharing.set(true);
    try {
      const result = await this.webShare.share({
        title: localized.title,
        text: localized.excerpt,
      });

      if (result === 'unavailable') {
        this.toast.show(this.copy().shareUnavailable, 'error');
      }
    } finally {
      this.sharing.set(false);
    }
  }

  protected shareLink(
    platform: SharePlatform,
    localized: GuideTranslation,
  ): string {
    return this.webShare.platformLink(platform, {
      title: localized.title,
      text: localized.excerpt,
    });
  }

  protected async copyGuideLink(): Promise<void> {
    const result = await this.webShare.copyLink();
    this.toast.show(
      result === 'copied'
        ? this.copy().shareCopied
        : this.copy().shareUnavailable,
      result === 'copied' ? 'success' : 'error',
    );
  }
}
