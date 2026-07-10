import { Component, input } from '@angular/core';

export type AlertTone = 'danger' | 'info' | 'success' | 'warning';

/** Attention banner. Content is projected — most usages are a single line of interpolated error/status text. */
@Component({
  selector: 'byiara-alert',
  imports: [],
  templateUrl: './alert.html',
  styleUrl: './alert.css',
})
export class Alert {
  tone = input<AlertTone>('danger');
}
