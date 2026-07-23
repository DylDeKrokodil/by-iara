import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const session = {
  accessToken: 'signed-access-token',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  admin: { email: 'admin@example.com', role: 'ADMIN' },
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps the access token in memory and never writes session data to localStorage', () => {
    localStorage.clear();

    auth.login('admin@example.com', 'secret').subscribe();
    http
      .expectOne('/api/admin/auth/login')
      .flush(session);

    expect(auth.token()).toBe('signed-access-token');
    expect(auth.isAuthenticated()).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('restores a session through the server-managed refresh cookie', () => {
    let restored = false;
    auth.restoreSession().subscribe((value) => {
      restored = value;
    });

    const request = http.expectOne('/api/admin/auth/refresh');
    expect(request.request.body).toEqual({});
    request.flush(session);

    expect(restored).toBe(true);
    expect(auth.token()).toBe('signed-access-token');
  });

  it('stays signed out when no refresh cookie is accepted', () => {
    let restored = true;
    auth.restoreSession().subscribe((value) => {
      restored = value;
    });

    http
      .expectOne('/api/admin/auth/refresh')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(restored).toBe(false);
    expect(auth.token()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });
});
