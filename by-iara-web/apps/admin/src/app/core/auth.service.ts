import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AdminIdentity {
  email: string;
  role: string;
}

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  admin: AdminIdentity;
}

const TOKEN_KEY = 'byiara.admin.token';
const REFRESH_KEY = 'byiara.admin.refresh';
const ADMIN_KEY = 'byiara.admin.identity';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _admin = signal<AdminIdentity | null>(this.readStoredAdmin());
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
      .post<SessionResponse>('/api/admin/auth/refresh', {
        refreshToken: this.refreshToken(),
      })
      .pipe(tap((response) => this.storeSession(response)));
  }

  logout(): void {
    const refreshToken = this.refreshToken();
    if (refreshToken) {
      // Best-effort server-side revocation; local state is cleared regardless.
      this.http
        .post('/api/admin/auth/logout', { refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.clearSession();
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  private storeSession(response: SessionResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_KEY, response.refreshToken);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin));
    this._admin.set(response.admin);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ADMIN_KEY);
    this._admin.set(null);
  }

  private readStoredAdmin(): AdminIdentity | null {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AdminIdentity;
    } catch {
      localStorage.removeItem(ADMIN_KEY);
      return null;
    }
  }
}
