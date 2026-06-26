/**
 * ============================================================================
 *  AUTH SERVICE
 * ============================================================================
 *  Owns everything about "is the user logged in" for the app.
 *
 *  DATA FLOW
 *  ---------
 *   - mockMode === true  (Hours 1-4): login() does NOT hit a server. It accepts
 *     any non-empty credentials and stores a hard-coded token + admin user in
 *     localStorage. This lets the whole UI be built before the backend exists.
 *
 *   - mockMode === false (Hour 5):    login() POSTs to /api/auth/login and
 *     stores the REAL JWT returned by the backend.
 *
 *  Persistence is localStorage so a page refresh keeps the user signed in.
 *  The token is read back by:
 *    - authInterceptor  -> attaches it as `Authorization: Bearer <token>`
 *    - authGuard        -> blocks /dashboard when no token is present
 * ============================================================================
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthUser, LoginRequest, LoginResponse } from '../models/user.model';

/** localStorage keys — kept in one place to avoid typos across the app. */
const TOKEN_KEY = 'issa_token';
const USER_KEY = 'issa_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /**
   * Reactive auth state. We seed it from localStorage so a refresh keeps the
   * session. Components can read `isLoggedIn()` / `currentUser()` as signals.
   */
  private readonly userSig = signal<AuthUser | null>(this.readStoredUser());

  /** Signal: the logged-in user (or null). */
  readonly currentUser = this.userSig.asReadonly();
  /** Signal: true when a token is present. */
  readonly isLoggedIn = computed(() => this.userSig() !== null);

  /** Plain getter kept for the auth guard / interceptor (non-reactive reads). */
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Authenticate. Returns an Observable so the login component can show a
   * spinner / handle errors uniformly in both mock and live modes.
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    if (environment.mockMode) {
      return this.mockLogin(credentials);
    }

    // LIVE MODE (Hour 5): real backend issues the JWT.
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((res) => this.persistSession(res.token, res.user)));
  }

  /** Clear the session and reset reactive state. */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSig.set(null);
  }

  /* ------------------------------------------------------------------ *
   *  Internals
   * ------------------------------------------------------------------ */

  /**
   * Mock authentication. Any non-empty username/password is accepted and a
   * fixed admin identity is stored. We wrap it in of() so callers can treat it
   * exactly like the real HTTP call (same Observable contract).
   */
  private mockLogin(credentials: LoginRequest): Observable<LoginResponse> {
    const response: LoginResponse = {
      success: true,
      token: 'mock-jwt-token',
      user: {
        username: credentials.username || 'admin',
        role: 'admin',
        full_name: 'Test Admin',
      },
    };
    return of(response).pipe(tap((res) => this.persistSession(res.token, res.user)));
  }

  /** Write token + user to localStorage and update the reactive signal. */
  private persistSession(token: string, user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSig.set(user);
  }

  /** Rehydrate the user object from localStorage on service creation. */
  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null; // corrupt value — treat as logged out
    }
  }
}
