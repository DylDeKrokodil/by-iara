import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';

export interface AdminIdentity {
  email: string;
  role: string;
}

interface SessionResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  admin: AdminIdentity;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private accessToken: string | null = null;

  private readonly _admin = signal<AdminIdentity | null>(null);
  readonly admin = this._admin.asReadonly();
  readonly isAuthenticated = computed(() => this._admin() !== null);

  login(email: string, password: string): Observable<SessionResponse> {
    return this.http
      .post<SessionResponse>('/api/admin/auth/login', { email, password })
      .pipe(tap((response) => this.storeSession(response)));
  }

  /**
   * Exchanges the stored refresh token for a fresh session. Errors propagate so the
   * caller (the interceptor) can fall back to logging out.
   */
  refresh(): Observable<SessionResponse> {
    return this.http
      .post<SessionResponse>('/api/admin/auth/refresh', {})
      .pipe(tap((response) => this.storeSession(response)));
  }

  restoreSession(): Observable<boolean> {
    if (this.accessToken && this._admin()) {
      return of(true);
    }
    return this.refresh().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  logout(): void {
    // Best-effort server-side revocation; local state is cleared regardless.
    this.http
      .post('/api/admin/auth/logout', {})
      .subscribe({ error: () => undefined });
    this.clearSession();
  }

  token(): string | null {
    return this.accessToken;
  }

  private storeSession(response: SessionResponse): void {
    this.accessToken = response.accessToken;
    this._admin.set(response.admin);
  }

  private clearSession(): void {
    this.accessToken = null;
    this._admin.set(null);
  }
}
