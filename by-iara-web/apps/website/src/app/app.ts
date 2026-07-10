import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { Button, ToastContainerComponent } from '@by-iara/shared-ui';
import { LanguageService } from './i18n/language.service';
import { LanguageSwitcher } from './i18n/language-switcher/language-switcher';

@Component({
  imports: [RouterModule, ToastContainerComponent, LanguageSwitcher, Button],
  selector: 'byiara-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);

  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().app);
  protected readonly menuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
