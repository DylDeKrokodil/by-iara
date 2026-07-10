import { Component, input } from '@angular/core';

/**
 * Rotating loading indicator. Purely visual by default (`aria-hidden`); pass
 * `label` when there is no sibling text announcing the loading state, e.g.
 * inside a `byiara-button`.
 */
@Component({
  selector: 'byiara-spinner',
  imports: [],
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
})
export class Spinner {
  size = input<'sm' | 'md'>('md');
  label = input<string | null>(null);
}
