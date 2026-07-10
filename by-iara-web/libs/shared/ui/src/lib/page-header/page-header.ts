import { Component, input } from '@angular/core';

/** Title area for a list/detail page: optional eyebrow, title, and a projected trailing action. */
@Component({
  selector: 'byiara-page-header',
  imports: [],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {
  eyebrow = input<string | null>(null);
  title = input.required<string>();
}
