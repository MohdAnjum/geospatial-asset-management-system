import { Routes } from '@angular/router';

/**
 * Authentication feature routes. Lazily loaded from app.routes.ts at `/login`.
 */
export const AUTHENTICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
];
