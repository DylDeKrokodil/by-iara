import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectField } from './select-field';

describe('SelectField', () => {
  let fixture: ComponentFixture<SelectField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectField],
    }).compileComponents();
    fixture = TestBed.createComponent(SelectField);
    fixture.componentRef.setInput('label', 'Day');
    fixture.componentRef.setInput('options', [
      { label: 'Choose a day', value: '' },
    ]);
    fixture.componentRef.setInput('value', '');
  });

  it('reports blur and associates an error with the trigger', () => {
    let touchCount = 0;
    fixture.componentInstance.touched.subscribe(() => touchCount++);
    fixture.componentRef.setInput('error', 'Choose a day.');
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    const error = fixture.nativeElement.querySelector(
      '.select-error',
    ) as HTMLElement;
    trigger.dispatchEvent(new Event('blur'));

    expect(touchCount).toBe(1);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-describedby')).toBe(error.id);
  });
});
