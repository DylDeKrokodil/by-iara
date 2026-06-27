import { NgTemplateOutlet } from '@angular/common';
import { Component, ContentChild, TemplateRef, ViewEncapsulation, computed, input } from '@angular/core';

export interface DataTableColumn {
  key: string;
  label: string;
  fit?: boolean;
  width?: string;
}

@Component({
  selector: 'byiara-data-table',
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
  encapsulation: ViewEncapsulation.None,
})
export class DataTable {
  columns = input.required<ReadonlyArray<DataTableColumn>>();
  rows = input<ReadonlyArray<unknown>>([]);
  loading = input(false);
  rowKey = input<string | null>('id');
  skeletonRows = input(4);
  ariaLabel = input<string | null>(null);

  @ContentChild('rowTemplate') protected rowTemplate?: TemplateRef<{ $implicit: unknown; index: number }>;

  protected readonly skeletonRowIndexes = computed(() => {
    const rowCount = Math.max(this.skeletonRows(), 0);

    return Array.from({ length: rowCount }, (_, index) => index);
  });

  protected rowIdentity(row: unknown, index: number): unknown {
    const rowKey = this.rowKey();

    if (!rowKey || row === null || typeof row !== 'object') {
      return index;
    }

    return (row as Record<string, unknown>)[rowKey] ?? index;
  }
}
