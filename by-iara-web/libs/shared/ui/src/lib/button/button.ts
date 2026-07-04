import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Spinner } from '../spinner/spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'open' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

/**
 * Renders as a native <button>, or as an <a> when `href`/`routerLink` is set.
 * Bind (click) on <byiara-button> either way — the inner element's click
 * bubbles up to the host natively, so this owns no click output itself.
 */
@Component({
  selector: 'byiara-button',
  imports: [RouterLink, Spinner],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false, { transform: booleanAttribute });
  loading = input(false, { transform: booleanAttribute });
  iconOnly = input(false, { transform: booleanAttribute });
  href = input<string | null>(null);
  routerLink = input<string | ReadonlyArray<string | number> | null>(null);
  ariaLabel = input<string | null>(null);

  protected readonly classes = computed(() => {
    const classes = ['btn', `btn-${this.variant()}`];
    if (this.size() === 'sm') {
      classes.push('btn-sm');
    }
    if (this.iconOnly()) {
      classes.push('btn-icon');
    }
    return classes.join(' ');
  });
}
