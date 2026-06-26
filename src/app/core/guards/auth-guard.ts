/**
 * ============================================================================
 *  AUTH GUARD (functional CanActivateFn)
 * ============================================================================
 *  Protects routes that require a logged-in user (e.g. /dashboard). If there is
 *  no session it redirects to /login and BLOCKS navigation by returning a
 *  UrlTree. Wired in app.routes.ts via `canActivate: [authGuard]`.
 * ============================================================================
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Logged in -> allow navigation.
  if (auth.isLoggedIn()) {
    return true;
  }

  // Not logged in -> redirect to the login page (returns a UrlTree, which
  // cancels the current navigation and starts a new one to /login).
  return router.createUrlTree(['/login']);
};
