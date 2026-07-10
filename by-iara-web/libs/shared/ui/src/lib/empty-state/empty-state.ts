import { Component, booleanAttribute, input } from '@angular/core';

/**
 * "Nothing here yet" block — neutral, not urgent (unlike Alert). Project an
 * action (e.g. a byiara-button) as content for "create your first X" states.
 */
@Component({
  selector: 'byiara-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  title = input<string | null>(null);
  description = input<string | null>(null);
  compact = input(false, { transform: booleanAttribute });
  dashed = input(true, { transform: booleanAttribute });
}
