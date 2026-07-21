import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { Button, ToastContainerComponent } from '@by-iara/shared-ui';
import { LanguageService } from './i18n/language.service';
import { LanguageSwitcher } from './i18n/language-switcher/language-switcher';
import { SeoService } from './seo/seo.service';
import { SiteIntroComponent } from './site-intro/site-intro.component';
import { BRAND, SOCIAL_LINKS } from './brand/brand';
import { BUSINESS_DETAILS } from './legal/business-details';
import { FeaturedDiscount, FeaturedDiscountApi } from './promotions/featured-discount-api';
import { PromotionBar } from './promotions/promotion-bar';

@Component({
  imports: [
    RouterModule,
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

  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().app);
  protected readonly menuOpen = signal(false);
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
    ? { prefix: 'Uma oferta para si:', suffix: 'de desconto com o código', action: 'Marcar agora', close: 'Fechar promoção' }
    : { prefix: 'A little something for you:', suffix: 'off with code', action: 'Book now', close: 'Close promotion' });
  protected readonly currentYear = new Date().getFullYear();
  protected readonly brand = BRAND;
  protected readonly socialLinks = SOCIAL_LINKS;
  protected readonly contact = {
    email: BUSINESS_DETAILS.email,
    emailHref: `mailto:${BUSINESS_DETAILS.email}`,
    phone: BUSINESS_DETAILS.phone,
    phoneHref: `tel:${BUSINESS_DETAILS.phone.replace(/\s/g, '')}`,
  };

  constructor() {
    this.featuredDiscountApi.get().subscribe({ next: (discount) => this.featuredDiscount.set(discount) });
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
