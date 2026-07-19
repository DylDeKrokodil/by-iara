import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../i18n/language.service';
import type { PackPresentation } from '../../packs/pack-presentation';
import { localizedService } from '../../services/services-api';

@Component({
  selector: 'byiara-home-pack',
  imports: [RouterLink],
  templateUrl: './home-pack.html',
  styleUrl: './home-pack.css',
})
export class HomePack {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().home);
  readonly item = input.required<PackPresentation>();

  protected serviceName(): string {
    return localizedService(this.item().service, this.language.current().locale)
      .name;
  }

  protected formatPrice(cents: number): string {
    return new Intl.NumberFormat(this.language.current().locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  }
}
