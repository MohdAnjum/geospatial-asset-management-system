/**
 * ============================================================================
 *  AUTH INTERCEPTOR (functional HttpInterceptorFn)
 * ============================================================================
 *  Runs on EVERY outgoing HttpClient request. If we have a token, it clones the
 *  request and adds `Authorization: Bearer <token>` so protected backend routes
 *  accept the call in live mode. In mock mode the token is the dummy
 *  'mock-jwt-token' and the JSON files ignore it — harmless.
 *
 *  Registered in app.config.ts:
 *     provideHttpClient(withInterceptors([authInterceptor]))
 * ============================================================================
 */
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;

  // No token yet (e.g. the login request itself) -> pass through untouched.
  if (!token) {
    return next(req);
  }

  // Clone is required: HttpRequest is immutable.
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};
