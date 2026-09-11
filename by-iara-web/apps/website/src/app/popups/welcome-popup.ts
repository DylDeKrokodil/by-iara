import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { AnnouncementCard } from '@by-iara/shared-ui';
import { LanguageService } from '../i18n/language.service';
import { getPublicPageKey, isLocalePath } from '../i18n/supported-locales';
import { PopupApi, PublicPopup } from './popup-api';

@Component({
  selector: 'byiara-welcome-popup',
  imports: [AnnouncementCard],
  templateUrl: './welcome-popup.html',
  styleUrl: './welcome-popup.css',
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
    '(document:focusin)': 'avoidObscuringFocus($event)',
  },
})
export class WelcomePopup {
  private readonly api = inject(PopupApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly element = inject(ElementRef<HTMLElement>);
  protected readonly language = inject(LanguageService);
  protected readonly popup = signal<PublicPopup | null>(null);
  protected readonly portuguese = computed(
    () => this.language.current().path === 'pt',
  );
  protected readonly copy = computed(() => this.language.messages().popup);
  protected readonly actionLabel = computed(
    () => this.copy().actions[this.popup()?.action ?? 'book'],
  );

  constructor() {
    // Hydration and crawlable page content complete independently of this enhancement.
    afterNextRender(() => {
      if (this.router.navigated) this.load();
      else
        this.router.events
          .pipe(
            filter((event) => event instanceof NavigationEnd),
            take(1),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe(() => this.load());
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.popup.set(null));
  }

  private load(): void {
    if (!this.eligibleRoute()) return;
    const initialUrl = this.router.url;
    this.api
      .active()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (popup) => {
          if (popup && this.router.url === initialUrl) this.popup.set(popup);
        },
        error: () => {
          /* Optional content must never interrupt the website. */
        },
      });
  }

  protected dismiss(restoreFocus = true): void {
    const popup = this.popup();
    if (!popup) return;
    if (
      restoreFocus &&
      this.element.nativeElement.contains(this.document.activeElement)
    ) {
      this.document
        .getElementById('main-content')
        ?.focus({ preventScroll: true });
    }
    this.popup.set(null);
  }

  protected onEscape(event: Event): void {
    if (event.defaultPrevented || this.document.querySelector('dialog[open]'))
      return;
    this.dismiss();
  }

  protected avoidObscuringFocus(event: FocusEvent): void {
    if (
      !this.popup() ||
      !(event.target instanceof HTMLElement) ||
      this.element.nativeElement.contains(event.target)
    )
      return;
    const panel = this.element.nativeElement
      .querySelector('.popup-position')
      ?.getBoundingClientRect();
    const target = event.target.getBoundingClientRect();
    if (
      panel &&
      target.bottom > panel.top &&
      target.top < panel.bottom &&
      target.right > panel.left &&
      target.left < panel.right
    )
      this.popup.set(null);
  }

  private eligibleRoute(): boolean {
    const segments = this.router.url
      .split(/[?#]/)[0]
      .split('/')
      .filter(Boolean);
    if (!isLocalePath(segments[0])) return false;
    const page = getPublicPageKey(segments[0], segments[1]);
    return (
      page === 'home' ||
      page === 'services' ||
      page === 'packs' ||
      page === 'guides'
    );
  }
}
