import { TestBed } from '@angular/core/testing';
import { DataTable, DataTableSort } from './data-table';

describe('DataTable', () => {
  it('emits ascending then descending server sort requests', () => {
    const fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [
      { key: 'PRICE', label: 'Price', sortable: true },
    ]);
    const changes: DataTableSort[] = [];
    fixture.componentInstance.sortChange.subscribe((change) =>
      changes.push(change),
    );
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.byiara-data-table-sort',
    );
    button.click();
    expect(changes).toEqual([{ key: 'PRICE', direction: 'asc' }]);

    fixture.componentRef.setInput('sortKey', 'PRICE');
    fixture.componentRef.setInput('sortDirection', 'asc');
    fixture.detectChanges();
    button.click();
    expect(changes.at(-1)).toEqual({ key: 'PRICE', direction: 'desc' });
  });
});
