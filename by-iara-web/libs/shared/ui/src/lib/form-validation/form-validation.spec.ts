import { FormControl, Validators } from '@angular/forms';
import { touchedError } from './form-validation';

describe('touchedError', () => {
  it('waits until the field has been left', () => {
    const control = new FormControl('', Validators.required);

    expect(touchedError(control, { required: 'Required.' })).toBeNull();

    control.markAsTouched();
    expect(touchedError(control, { required: 'Required.' })).toBe('Required.');
  });

  it('returns the matching validation message', () => {
    const control = new FormControl('not-an-email', Validators.email);
    control.markAsTouched();

    expect(touchedError(control, { email: 'Enter a valid email.' })).toBe(
      'Enter a valid email.',
    );
  });
});
