import { AbstractControl } from '@angular/forms';

export type ValidationMessages = Readonly<Record<string, string>>;

/**
 * Resolves the first validation message only after a user has left the field.
 * Submit handlers may still call markAllAsTouched() as a final safety net.
 */
export function touchedError(
  control: AbstractControl | null | undefined,
  messages: ValidationMessages,
): string | null {
  if (!control?.touched || !control.errors) return null;

  for (const key of [
    'required',
    'email',
    'pattern',
    'min',
    'max',
    'maxlength',
    'minlength',
  ]) {
    if (control.hasError(key) && messages[key]) return messages[key];
  }

  const firstKnownError = Object.keys(control.errors).find(
    (key) => messages[key],
  );
  return firstKnownError ? messages[firstKnownError] : null;
}
