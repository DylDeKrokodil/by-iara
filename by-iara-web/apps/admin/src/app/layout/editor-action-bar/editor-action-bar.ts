import { booleanAttribute, Component, input } from '@angular/core';

export type EditorActionBarTone = 'neutral' | 'danger' | 'success';

/**
 * Persistent actions for full-page admin editors.
 *
 * The host stays in normal form flow while becoming sticky in the workspace,
 * so reaching the end of an editor never leaves content hidden underneath it.
 */
@Component({
  selector: 'byiara-editor-action-bar',
  imports: [],
  templateUrl: './editor-action-bar.html',
  styleUrl: './editor-action-bar.css',
})
export class EditorActionBar {
  status = input<string | null>(null);
  tone = input<EditorActionBarTone>('neutral');
  stackActionsOnMobile = input(false, { transform: booleanAttribute });
}
