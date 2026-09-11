import {
  Component,
  afterRenderEffect,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { filter } from 'rxjs';
import { Button, ToastContainerComponent } from '@by-iara/shared-ui';
import { LanguageService } from './i18n/language.service';
import { LanguageSwitcher } from './i18n/language-switcher/language-switcher';
import { SeoService } from './seo/seo.service';
import { BRAND, SOCIAL_LINKS } from './brand/brand';
import { GuidesApi } from './guides/guides-api';
import { HeaderAppearanceService } from './header-appearance.service';
import { BUSINESS_DETAILS } from './legal/business-details';
import {
  FeaturedDiscount,
  FeaturedDiscountApi,
} from './promotions/featured-discount-api';
import { WelcomePopup } from './popups/welcome-popup';
import { PromotionBar } from './promotions/promotion-bar';

@Component({
  imports: [
    RouterModule,
    NgIcon,
    ToastContainerComponent,
    LanguageSwitcher,
    Button,
    PromotionBar,
    WelcomePopup,
  ],
  selector: 'byiara-root',
  host: { '(document:keydown.escape)': 'closeMenu(true)' },
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly headerLayout =
    viewChild<ElementRef<HTMLElement>>('headerLayout');
  private readonly seo = inject(SeoService);
  private readonly featuredDiscountApi = inject(FeaturedDiscountApi);
  private readonly guidesApi = inject(GuidesApi);

  protected readonly language = inject(LanguageService);
  protected readonly headerAppearance = inject(HeaderAppearanceService);
  protected readonly copy = computed(() => this.language.messages().app);
  protected readonly menuOpen = signal(false);
  private readonly menuToggle =
    viewChild<ElementRef<HTMLButtonElement>>('menuToggle');
  private readonly mainContent =
    viewChild<ElementRef<HTMLElement>>('mainContent');
  protected readonly hasGuides = signal(false);
  protected readonly featuredDiscount = signal<FeaturedDiscount | null>(null);
  protected readonly promotionDismissed = signal(false);
  protected readonly promotionBenefit = computed(() => {
    const discount = this.featuredDiscount();
    if (!discount) return '';
    if (discount.valueType === 'PERCENTAGE')
      return `${discount.valueAmount / 100}%`;
    return new Intl.NumberFormat(
      this.language.current().locale === 'pt-PT' ? 'pt-PT' : 'en-IE',
      {
        style: 'currency',
        currency: discount.currency || 'EUR',
      },
    ).format(discount.valueAmount / 100);
  });
  protected readonly promotionCopy = computed(() =>
    this.language.current().locale === 'pt-PT'
      ? {
          prefix: 'Uma oferta para si:',
          suffix: 'de desconto com o código',
          close: 'Fechar promoção',
        }
      : {
          prefix: 'A little something for you:',
          suffix: 'off with code',
          close: 'Close promotion',
        },
  );
  protected readonly currentYear = new Date().getFullYear();
  protected readonly brand = BRAND;
  protected readonly socialLinks = SOCIAL_LINKS;
  protected readonly contact = {
    email: BUSINESS_DETAILS.email,
    emailHref: `mailto:${BUSINESS_DETAILS.email}`,
  };

  constructor() {
    afterRenderEffect((onCleanup) => {
      const header = this.headerLayout()?.nativeElement;
      if (!header) return;
      const measureHeader = () => {
        // Hydration can replace the observed node. Never overwrite the
        // fallback with the zero size of a detached or hidden element.
        if (!header.isConnected) return;
        const height = Math.ceil(header.getBoundingClientRect().height);
        if (height <= 0) return;
        document.documentElement.style.setProperty(
          '--byiara-site-header-height',
          `${height + 1}px`,
        );
      };
      measureHeader();
      const observer = new ResizeObserver(measureHeader);
      observer.observe(header);
      onCleanup(() => {
        observer.disconnect();
        document.documentElement.style.removeProperty(
          '--byiara-site-header-height',
        );
      });
    });
    this.featuredDiscountApi
      .get()
      .subscribe({ next: (discount) => this.featuredDiscount.set(discount) });
    this.guidesApi.hasPublished().subscribe({
      next: (hasGuides) => this.hasGuides.set(hasGuides),
    });
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        const wasOpen = this.menuOpen();
        this.menuOpen.set(false);
        if (wasOpen)
          this.mainContent()?.nativeElement.focus({ preventScroll: true });
        this.seo.updateStaticRoute(event.urlAfterRedirects);
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.menuToggle()?.nativeElement.focus();
  }

  protected focusMainContent(event: Event): void {
    event.preventDefault();
    this.mainContent()?.nativeElement.focus();
  }

  protected dismissPromotion(): void {
    this.promotionDismissed.set(true);
  }
}
