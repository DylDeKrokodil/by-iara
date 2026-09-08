import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../i18n/language.service';
import { promotionDisclaimer, promotionMessages } from './promotion-copy';
import { FeaturedDiscount } from './featured-discount-api';

export interface PromotionBarCopy {
  prefix: string;
  suffix: string;
  close: string;
}

@Component({
  selector: 'byiara-promotion-bar',
  imports: [RouterLink],
  templateUrl: './promotion-bar.html',
  styleUrl: './promotion-bar.css',
})
export class PromotionBar {
  protected readonly language = inject(LanguageService);
  protected messages() {
    return promotionMessages(this.language.current().path);
  }
  protected disclaimer() {
    return promotionDisclaimer(this.discount(), this.language.current().path);
  }
  readonly discount = input.required<FeaturedDiscount>();
  readonly benefit = input.required<string>();
  readonly copy = input.required<PromotionBarCopy>();
  readonly dismissed = output<void>();
}
