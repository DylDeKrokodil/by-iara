import { Component, computed, inject } from '@angular/core';
import { Button } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'byiara-home',
  imports: [Button],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().home);
}
