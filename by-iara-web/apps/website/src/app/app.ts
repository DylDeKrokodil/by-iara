import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastContainerComponent } from '@by-iara/shared-ui';
import { LanguageService } from './i18n/language.service';
import { LanguageSwitcher } from './i18n/language-switcher/language-switcher';

@Component({
  imports: [RouterModule, ToastContainerComponent, LanguageSwitcher],
  selector: 'byiara-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().app);
}
