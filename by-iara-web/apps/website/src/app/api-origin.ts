import { InjectionToken } from '@angular/core';

/** Empty in the browser (same-origin); overridden with the internal API origin during SSR. */
export const API_ORIGIN = new InjectionToken<string>('API_ORIGIN', {
  providedIn: 'root',
  factory: () => '',
});

export function apiUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, '')}${path}`;
}
