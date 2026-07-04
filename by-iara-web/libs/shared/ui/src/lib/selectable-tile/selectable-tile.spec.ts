import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectableTile } from './selectable-tile';

describe('SelectableTile', () => {
  let fixture: ComponentFixture<SelectableTile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectableTile],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectableTile);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('exposes radio semantics by default', () => {
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('role')).toBe('radio');
    expect(host.getAttribute('aria-checked')).toBe('false');
  });
});
