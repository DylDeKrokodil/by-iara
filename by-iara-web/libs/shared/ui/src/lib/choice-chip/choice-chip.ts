import { Component, booleanAttribute, input } from '@angular/core';

/**
 * A selectable chip rendered as a button. Use the attribute selector on a
 * native <button> so callers keep full control of click handling, layout
 * classes and per-item style hooks (e.g. --stagger), while this component
 * owns the shared look, press feedback and radio semantics.
 */
@Component({
  selector: 'button[byiara-choice-chip]',
  imports: [],
  templateUrl: './choice-chip.html',
  styleUrl: './choice-chip.css',
  host: {
    class: 'choice-chip',
    type: 'button',
    '[class.selected]': 'selected()',
    '[disabled]': 'disabled()',
    '[attr.role]': "checkable() ? 'radio' : null",
    '[attr.aria-checked]': 'checkable() ? selected() : null',
  },
})
export class ChoiceChip {
  /** Whether this chip is the chosen one in its group. */
  selected = input(false, { transform: booleanAttribute });
  /** Disables interaction and dims the chip. */
  disabled = input(false, { transform: booleanAttribute });
  /** When true (default) the chip exposes radio semantics for a radiogroup. */
  checkable = input(true, { transform: booleanAttribute });
}
