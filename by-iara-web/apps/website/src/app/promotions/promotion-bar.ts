import { Component, input, output } from '@angular/core';
import { FeaturedDiscount } from './featured-discount-api';

export interface PromotionBarCopy {
  prefix: string;
  suffix: string;
  close: string;
}

@Component({
  selector: 'byiara-promotion-bar',
  templateUrl: './promotion-bar.html',
  styleUrl: './promotion-bar.css',
})
export class PromotionBar {
  readonly discount = input.required<FeaturedDiscount>();
  readonly benefit = input.required<string>();
  readonly copy = input.required<PromotionBarCopy>();
  readonly dismissed = output<void>();
}
