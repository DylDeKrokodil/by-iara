import { Component, computed, input } from '@angular/core';

export type StatusChipTone = 'success' | 'warning' | 'danger' | 'muted';

@Component({
  selector: 'byiara-status-chip',
  imports: [],
  templateUrl: './status-chip.html',
  styleUrl: './status-chip.css',
})
export class StatusChip {
  active = input<boolean | null>(null);
  label = input<string | null>(null);
  tone = input<StatusChipTone | null>(null);

  protected readonly displayLabel = computed(() => {
    const label = this.label();

    if (label) {
      return label;
    }

    return this.active() ? 'Active' : 'Inactive';
  });

  protected readonly badgeClass = computed(() => {
    const tone = this.tone();

    if (tone) {
      return `badge-${tone}`;
    }

    return this.active() ? 'badge-success' : 'badge-muted';
  });
}
