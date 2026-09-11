import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorActionBar } from './editor-action-bar';

describe('EditorActionBar', () => {
  let fixture: ComponentFixture<EditorActionBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorActionBar],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorActionBar);
  });

  it('announces the current editor status', async () => {
    fixture.componentRef.setInput('status', 'Unsaved changes');
    await fixture.whenStable();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status.textContent).toContain('Unsaved changes');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('supports the stacked mobile action layout', async () => {
    fixture.componentRef.setInput('stackActionsOnMobile', true);
    await fixture.whenStable();

    const bar = fixture.nativeElement.querySelector('.editor-action-bar');
    expect(bar.classList.contains('editor-action-bar--stack-mobile')).toBe(
      true,
    );
  });
});
