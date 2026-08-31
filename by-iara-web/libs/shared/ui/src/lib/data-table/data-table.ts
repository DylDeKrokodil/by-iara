import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ContentChild,
  TemplateRef,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';

export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableSort {
  key: string;
  direction: DataTableSortDirection;
}

export interface DataTableColumn {
  key: string;
  label: string;
  fit?: boolean;
  width?: string;
  sortable?: boolean;
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
  responsiveStack = input(false);
  sortKey = input<string | null>(null);
  sortDirection = input<DataTableSortDirection>('asc');
  sortChange = output<DataTableSort>();

  @ContentChild('rowTemplate') protected rowTemplate?: TemplateRef<{
    $implicit: unknown;
    index: number;
  }>;

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

  protected ariaSort(
    column: DataTableColumn,
  ): 'ascending' | 'descending' | 'none' | null {
    if (!column.sortable) {
      return null;
    }
    if (this.sortKey() !== column.key) {
      return 'none';
    }
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortLabel(column: DataTableColumn): string {
    const nextDirection =
      this.sortKey() === column.key && this.sortDirection() === 'asc'
        ? 'descending'
        : 'ascending';
    return `Sort by ${column.label} ${nextDirection}`;
  }

  protected toggleSort(column: DataTableColumn): void {
    if (!column.sortable) {
      return;
    }

    const direction: DataTableSortDirection =
      this.sortKey() === column.key && this.sortDirection() === 'asc'
        ? 'desc'
        : 'asc';
    this.sortChange.emit({ key: column.key, direction });
  }
}
