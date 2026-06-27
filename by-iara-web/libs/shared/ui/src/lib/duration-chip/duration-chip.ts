import { Component, input } from '@angular/core';

@Component({
  selector: 'byiara-duration-chip',
  imports: [],
  templateUrl: './duration-chip.html',
  styleUrl: './duration-chip.css',
})
export class DurationChip {
  label = input.required<string>();
  active = input<boolean>(true);
}
