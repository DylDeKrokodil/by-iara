import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../language.service';

@Component({
  selector: 'byiara-language-switcher',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(
    () => this.language.messages().languageSwitcher,
  );
}
