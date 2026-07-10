import { Component, computed, inject } from '@angular/core';
import { Button } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';
import { NextAvailableBadge } from './next-available-badge/next-available-badge';

@Component({
  selector: 'byiara-home',
  imports: [Button, NextAvailableBadge],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().home);
}
