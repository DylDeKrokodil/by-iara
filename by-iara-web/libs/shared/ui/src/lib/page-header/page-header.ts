import { Component, booleanAttribute, computed, input } from '@angular/core';

/** Standard admin page heading: optional label, title, and a projected trailing action. */
@Component({
  selector: 'byiara-page-header',
  imports: [],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {
  label = input<string | null>(null);
  /** Backward-compatible display-system example API; admin pages use `label`. */
  eyebrow = input<string | null>(null);
  admin = input(false, { transform: booleanAttribute });
  title = input.required<string>();

  protected readonly displayedLabel = computed(() => this.label() ?? this.eyebrow());
}
