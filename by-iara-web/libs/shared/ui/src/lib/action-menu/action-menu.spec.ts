import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionMenu } from './action-menu';

describe('ActionMenu', () => {
  let fixture: ComponentFixture<ActionMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ActionMenu] }).compileComponents();

    fixture = TestBed.createComponent(ActionMenu);
    fixture.componentRef.setInput('items', [
      { id: 'edit', label: 'Edit expense', icon: 'edit' },
      { id: 'void', label: 'Void expense', icon: 'void', tone: 'danger' },
    ]);
    fixture.componentRef.setInput('ariaLabel', 'Actions for expense');
    fixture.detectChanges();
  });

  it('keeps actions icon-only while exposing reusable tooltip and accessible labels', () => {
    const trigger = fixture.nativeElement.querySelector('.action-menu-trigger') as HTMLButtonElement;
    const items = fixture.nativeElement.querySelectorAll('.action-menu-item') as NodeListOf<HTMLButtonElement>;

    expect(trigger.getAttribute('aria-label')).toBe('Actions for expense');
    expect(trigger.dataset['tooltip']).toBe('More actions');
    expect(items[0].getAttribute('aria-label')).toBe('Edit expense');
    expect(items[0].dataset['tooltip']).toBe('Edit expense');
    expect(items[0].querySelector('svg')).toBeTruthy();
    expect(items[0].querySelector('.visually-hidden')?.textContent).toContain('Edit expense');
    expect(items[0].hasAttribute('title')).toBe(false);
  });
});
