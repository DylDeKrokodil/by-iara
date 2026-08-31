import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  message?: unknown;
}

/** Returns a safe API-provided message without exposing arbitrary response data. */
export function apiErrorMessage(
  error: HttpErrorResponse,
  fallback: string,
): string {
  const body = error.error as ApiErrorBody | string | null | undefined;
  const message = typeof body === 'string' ? body : body?.message;

  return typeof message === 'string' && message.trim()
    ? message.trim()
    : fallback;
}
