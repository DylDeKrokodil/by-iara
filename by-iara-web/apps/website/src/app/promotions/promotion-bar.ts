import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeaturedDiscount } from './featured-discount-api';

export interface PromotionBarCopy {
  prefix: string;
  suffix: string;
  action: string;
  close: string;
}

@Component({
  selector: 'byiara-promotion-bar',
  imports: [RouterLink],
  templateUrl: './promotion-bar.html',
  styleUrl: './promotion-bar.css',
})
export class PromotionBar {
  readonly discount = input.required<FeaturedDiscount>();
  readonly benefit = input.required<string>();
  readonly copy = input.required<PromotionBarCopy>();
  readonly bookingLink = input.required<readonly string[]>();
  readonly dismissed = output<void>();
}
