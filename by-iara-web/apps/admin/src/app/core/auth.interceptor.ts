import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  Observable,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { AuthService } from './auth.service';

// Shared across concurrent requests so a burst of 401s triggers a single refresh
// instead of a stampede. Holds the in-flight refresh until it settles.
let refreshInFlight: Observable<string> | null = null;

function withToken(
  req: HttpRequest<unknown>,
  token: string,
): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // The auth endpoints manage tokens themselves; never attach a token or try to
  // refresh on their behalf (that would recurse on a 401 from /refresh).
  const isAuthEndpoint = req.url.includes('/api/admin/auth/');
  const token = auth.token();
  const initialReq =
    token && req.url.startsWith('/api/') && !isAuthEndpoint
      ? withToken(req, token)
      : req;

  return next(initialReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const canRefresh =
        error.status === 401 && !isAuthEndpoint;

      if (!canRefresh) {
        return throwError(() => error);
      }

      if (!refreshInFlight) {
        refreshInFlight = auth.refresh().pipe(
          switchMap(() => {
            const fresh = auth.token();
            return fresh
              ? of(fresh)
              : throwError(() => new Error('Refresh returned no token'));
          }),
          finalize(() => {
            refreshInFlight = null;
          }),
          shareReplay(1),
        );
      }

      return refreshInFlight.pipe(
        switchMap((newToken) => next(withToken(req, newToken))),
        catchError((refreshError) => {
          auth.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
