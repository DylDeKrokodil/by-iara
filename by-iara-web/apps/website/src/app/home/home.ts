import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'byiara-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().home);
}
