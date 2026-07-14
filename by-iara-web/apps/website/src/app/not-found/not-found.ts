import { Component, RESPONSE_INIT, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'byiara-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(
    () => this.language.messages().serviceDetail,
  );

  constructor() {
    const responseInit = inject(RESPONSE_INIT);
    if (responseInit) {
      responseInit.status = 404;
    }
  }
}
