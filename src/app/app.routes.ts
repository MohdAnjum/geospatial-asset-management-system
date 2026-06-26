import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';

/**
 * ============================================================================
 *  ROOT ROUTE TABLE
 * ============================================================================
 *   /            -> redirect to /login
 *   /login       -> authentication feature (public)
 *   /dashboard   -> dashboard feature, PROTECTED by authGuard
 *   **           -> anything unknown falls back to /login
 *
 *  Features are lazy-loaded (loadChildren) so each ships in its own chunk.
 * ============================================================================
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/authentication/routes').then((m) => m.AUTHENTICATION_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/routes').then((m) => m.DASHBOARD_ROUTES),
  },
  { path: '**', redirectTo: 'login' },
];
