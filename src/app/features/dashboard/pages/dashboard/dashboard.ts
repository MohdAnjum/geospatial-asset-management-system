/**
 * ============================================================================
 *  DASHBOARD  (FE-2 layout) — the authenticated shell
 * ============================================================================
 *  Assembles the whole operations view:
 *
 *    ┌────────────────── top nav (52px) ──────────────────┐
 *    │ ISSA POC · active chip · 2D/3D toggle · user · out  │
 *    ├──────────┬───────────────────────────┬─────────────┤
 *    │  Alerts  │      Map  OR  Cesium       │   Assets    │
 *    │  220px   │           1fr              │   380px     │
 *    └──────────┴───────────────────────────┴─────────────┘
 *
 *  CENTRE TOGGLE
 *   The 2D map stays MOUNTED the whole time (just hidden in 3D) so any asset
 *   added during the session keeps its marker. The Cesium globe is mounted
 *   lazily on first switch to 3D and then kept alive — toggling only flips a
 *   CSS `hidden` class, never destroys state.
 * ============================================================================
 */
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AlertsPanelComponent } from '../../../alerts/components/alerts-panel/alerts-panel';
import { MapViewComponent } from '../../../map/components/map-view/map-view';
import { CesiumViewComponent } from '../../../cesium/components/cesium-view/cesium-view';
import { AssetTableComponent } from '../../../assets/components/asset-table/asset-table';

import { AssetService } from '../../../assets/services/asset.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [AlertsPanelComponent, MapViewComponent, CesiumViewComponent, AssetTableComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly assetService = inject(AssetService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Centre-panel mode. */
  readonly viewMode = signal<'2d' | '3d'>('2d');
  /** Whether the Cesium component has been created yet (lazy + kept alive). */
  readonly cesiumMounted = signal(false);

  /** Signed-in user (for the nav-bar name). */
  readonly user = this.auth.currentUser;

  /** "active asset count" chip — number of assets in the `active` state. */
  readonly activeCount = computed(
    () => this.assetService.assets().filter((a) => a.status === 'active').length,
  );
  /** Total assets (shown alongside the active chip for context). */
  readonly totalCount = computed(() => this.assetService.assets().length);

  /** Switch the centre panel; mount Cesium on first 3D request. */
  setView(mode: '2d' | '3d'): void {
    if (mode === '3d') this.cesiumMounted.set(true);
    this.viewMode.set(mode);
  }

  /** Sign out and return to the login page. */
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
