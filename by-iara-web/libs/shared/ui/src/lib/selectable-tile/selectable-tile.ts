import { Component, booleanAttribute, input } from '@angular/core';

export type SelectableTileShape = 'square' | 'rect';

/**
 * The tile counterpart to ChoiceChip's pill, for calendar/time-grid pickers.
 * Same interaction states (idle soft-rose border; rose tint + solid rose
 * border + shadow when selected) — `shape` only changes layout: `square`
 * for a day tile (room for a caller-projected weekday label above a bold
 * day number), `rect` for a flat single-line time slot. Content is
 * caller-projected either way, same as ChoiceChip.
 */
@Component({
  selector: 'button[byiara-selectable-tile]',
  imports: [],
  templateUrl: './selectable-tile.html',
  styleUrl: './selectable-tile.css',
  host: {
    '[class]': "'tile tile-' + shape()",
    '[class.selected]': 'selected()',
    type: 'button',
    '[disabled]': 'disabled()',
    '[attr.role]': "checkable() ? 'radio' : null",
    '[attr.aria-checked]': 'checkable() ? selected() : null',
  },
})
export class SelectableTile {
  selected = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
  shape = input<SelectableTileShape>('square');
  checkable = input(true, { transform: booleanAttribute });
}
