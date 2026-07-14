import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).location.origin,
});
