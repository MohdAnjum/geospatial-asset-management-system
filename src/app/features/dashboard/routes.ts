import { Routes } from '@angular/router';

/**
 * Dashboard feature routes. Lazily loaded from app.routes.ts at `/dashboard`
 * (behind the auth guard).
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
];
