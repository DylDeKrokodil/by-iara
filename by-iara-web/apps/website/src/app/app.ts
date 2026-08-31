import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { filter } from 'rxjs';
import { Button, ToastContainerComponent } from '@by-iara/shared-ui';
import { LanguageService } from './i18n/language.service';
import { LanguageSwitcher } from './i18n/language-switcher/language-switcher';
import { SeoService } from './seo/seo.service';
import { SiteIntroComponent } from './site-intro/site-intro.component';
import { BRAND, SOCIAL_LINKS } from './brand/brand';
import { GuidesApi } from './guides/guides-api';
import { BUSINESS_DETAILS } from './legal/business-details';
import { FeaturedDiscount, FeaturedDiscountApi } from './promotions/featured-discount-api';
import { PromotionBar } from './promotions/promotion-bar';

@Component({
  imports: [
    RouterModule,
    NgIcon,
    ToastContainerComponent,
    LanguageSwitcher,
    Button,
    SiteIntroComponent,
    PromotionBar,
  ],
  selector: 'byiara-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly featuredDiscountApi = inject(FeaturedDiscountApi);
  private readonly guidesApi = inject(GuidesApi);

  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().app);
  protected readonly menuOpen = signal(false);
  protected readonly hasGuides = signal(false);
  protected readonly featuredDiscount = signal<FeaturedDiscount | null>(null);
  protected readonly promotionDismissed = signal(false);
  protected readonly promotionBenefit = computed(() => {
    const discount = this.featuredDiscount();
    if (!discount) return '';
    if (discount.valueType === 'PERCENTAGE') return `${discount.valueAmount / 100}%`;
    return new Intl.NumberFormat(this.language.current().locale === 'pt-PT' ? 'pt-PT' : 'en-IE', {
      style: 'currency', currency: discount.currency || 'EUR',
    }).format(discount.valueAmount / 100);
  });
  protected readonly promotionCopy = computed(() => this.language.current().locale === 'pt-PT'
    ? { prefix: 'Uma oferta para si:', suffix: 'de desconto com o código', close: 'Fechar promoção' }
    : { prefix: 'A little something for you:', suffix: 'off with code', close: 'Close promotion' });
  protected readonly currentYear = new Date().getFullYear();
  protected readonly brand = BRAND;
  protected readonly socialLinks = SOCIAL_LINKS;
  protected readonly contact = {
    email: BUSINESS_DETAILS.email,
    emailHref: `mailto:${BUSINESS_DETAILS.email}`,
  };

  constructor() {
    this.featuredDiscountApi.get().subscribe({ next: (discount) => this.featuredDiscount.set(discount) });
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
        this.menuOpen.set(false);
        this.seo.updateStaticRoute(event.urlAfterRedirects);
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected dismissPromotion(): void {
    this.promotionDismissed.set(true);
  }
}
