import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

const DOMAIN_LABEL_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TOP_LEVEL_DOMAIN_PATTERN = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i;

/**
 * Validates a public email address rather than Angular's intentionally
 * permissive address format. Public addresses must use a fully qualified
 * domain so incomplete values such as `person@gmail` cannot pass.
 */
export const publicEmailValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const email = String(control.value ?? '').trim();
  if (!email) return null;
  if (Validators.email(control)) return { email: true };

  const separatorIndex = email.lastIndexOf('@');
  const domain = email.slice(separatorIndex + 1);
  if (domain.length > 253) return { email: true };

  const labels = domain.split('.');
  if (
    labels.length < 2 ||
    labels.some((label) => !DOMAIN_LABEL_PATTERN.test(label)) ||
    !TOP_LEVEL_DOMAIN_PATTERN.test(labels.at(-1) ?? '')
  ) {
    return { email: true };
  }

  return null;
};
