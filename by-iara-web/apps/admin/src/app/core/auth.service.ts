import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AdminIdentity {
  email: string;
  role: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  admin: AdminIdentity;
}

const TOKEN_KEY = 'byiara.admin.token';
const ADMIN_KEY = 'byiara.admin.identity';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _admin = signal<AdminIdentity | null>(this.readStoredAdmin());
  readonly admin = this._admin.asReadonly();
  readonly isAuthenticated = computed(() => this._admin() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/admin/auth/login', { email, password })
      .pipe(
        tap((response) => {
          localStorage.setItem(TOKEN_KEY, response.accessToken);
          localStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin));
          this._admin.set(response.admin);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    this._admin.set(null);
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
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
