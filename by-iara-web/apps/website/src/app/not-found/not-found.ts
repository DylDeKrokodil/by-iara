import { Component, RESPONSE_INIT, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';
import { BUSINESS_DETAILS } from '../legal/business-details';

@Component({
  selector: 'byiara-not-found',
  imports: [Button, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().notFound);
  protected readonly contactHref = `mailto:${BUSINESS_DETAILS.email}`;

  constructor() {
    const responseInit = inject(RESPONSE_INIT);
    if (responseInit) {
      responseInit.status = 404;
    }
  }
}
