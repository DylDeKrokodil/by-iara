import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { publicEmailValidator } from './email-validator';

describe('publicEmailValidator', () => {
  it.each([
    'dylan@gmail.com',
    'dylan.koffie+booking@sub.example.co.uk',
    'customer@example.travel',
  ])('accepts a complete public email address: %s', (email) => {
    expect(publicEmailValidator(new FormControl(email))).toBeNull();
  });

  it.each([
    'dylankoffiemok@gmail',
    'customer@example.',
    'customer@.com',
    'customer@example..com',
    'customer@-example.com',
    'customer@example.c',
    'not-an-email',
  ])('rejects an incomplete or malformed email address: %s', (email) => {
    expect(publicEmailValidator(new FormControl(email))).toEqual({
      email: true,
    });
  });

  it('leaves empty-value handling to the required validator', () => {
    expect(publicEmailValidator(new FormControl(''))).toBeNull();
  });
});
