import { Component, input } from '@angular/core';

@Component({
  selector: 'byiara-status-chip',
  imports: [],
  templateUrl: './status-chip.html',
  styleUrl: './status-chip.css',
})
export class StatusChip {
  active = input.required<boolean>();
}
