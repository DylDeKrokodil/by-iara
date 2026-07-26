import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  signal,
} from '@angular/core';

@Directive({
  selector: '[byiaraReveal]',
  host: {
    '[class.motion-reveal]': '!sequence()',
    '[class.motion-reveal-sequence]': 'sequence()',
    '[class.is-visible]': 'isVisible()',
  },
})
export class RevealOnScroll {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isVisible = signal(false);
  readonly sequence = input(false, {
    alias: 'byiaraRevealSequence',
    transform: booleanAttribute,
  });

  constructor() {
    afterNextRender(() => {
      if (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)
      ) {
        this.isVisible.set(true);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) {
            return;
          }

          this.isVisible.set(true);
          observer.disconnect();
        },
        {
          rootMargin: '0px 0px -8% 0px',
          threshold: 0.12,
        },
      );

      observer.observe(this.element.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
