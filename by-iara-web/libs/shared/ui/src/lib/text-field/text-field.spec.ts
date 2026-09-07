import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { touchedError } from '../form-validation/form-validation';
import { TextField } from './text-field';

@Component({
  imports: [ReactiveFormsModule, TextField],
  template: `
    <byiara-text-field
      label="Email"
      type="email"
      required
      [formControl]="control"
      [error]="
        touchedError(control, {
          required: 'Enter your email address.',
          email: 'Enter a valid email address.',
        })
      "
    />
  `,
})
class TestHost {
  readonly control = new FormControl('', [
    Validators.required,
    Validators.email,
  ]);
  readonly touchedError = touchedError;
}

describe('TextField', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  it('reveals and associates its validation error after blur', () => {
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(fixture.nativeElement.textContent).not.toContain(
      'Enter your email address.',
    );

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector(
      '.field-error',
    ) as HTMLElement;
    expect(error.textContent).toContain('Enter your email address.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });
});
