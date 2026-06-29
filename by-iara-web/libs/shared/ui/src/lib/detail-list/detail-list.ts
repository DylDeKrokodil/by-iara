import { Component, booleanAttribute, input } from '@angular/core';

export interface DetailListItem {
  readonly term: string;
  readonly detail: string;
}

/** A term/detail (dt/dd) list for summaries, review panels and receipts. */
@Component({
  selector: 'byiara-detail-list',
  imports: [],
  templateUrl: './detail-list.html',
  styleUrl: './detail-list.css',
})
export class DetailList {
  items = input.required<ReadonlyArray<DetailListItem>>();
  /** Wraps the list in a bordered, padded surface (e.g. a confirmation receipt). */
  boxed = input(false, { transform: booleanAttribute });
}
