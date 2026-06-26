/**
 * ============================================================================
 *  CESIUM 3D GLOBE  (FE-1.4) — with graceful fallback
 * ============================================================================
 *  Shows assets on a 3D globe at their true altitude — the context a flat 2D
 *  map cannot convey (e.g. a geostationary satellite at 35,786 km vs a ground
 *  station at 0 km).
 *
 *  WHY FEATURE-DETECTION?
 *   Cesium is loaded as a global <script> in index.html (window.Cesium). If
 *   those files are missing, or WebGL is unavailable, we MUST NOT crash. So:
 *     1. Check `window.Cesium` exists.
 *     2. Try to construct the viewer inside try/catch.
 *   If either step fails we render a plain FALLBACK TABLE of orbital assets
 *   (altitude > 100 km) instead — the app keeps working.
 *
 *  No `import 'cesium'` here on purpose: we use the global build so the
 *  fallback path has nothing to fail on at module-load time.
 * ============================================================================
 */
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { AssetService } from '../../../assets/services/asset.service';
import { environment } from '../../../../environments/environment';

/** The global Cesium namespace injected by the <script> tag (typed loosely). */
declare const window: Window & { Cesium?: any };

@Component({
  selector: 'app-cesium-view',
  imports: [DecimalPipe],
  templateUrl: './cesium-view.html',
  styleUrl: './cesium-view.scss',
})
export class CesiumViewComponent implements AfterViewInit, OnDestroy {
  private readonly assetService = inject(AssetService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('globeEl', { static: true }) private globeEl!: ElementRef<HTMLDivElement>;

  /** null = not yet checked, true = globe live, false = showing fallback. */
  readonly cesiumReady = signal<boolean | null>(null);

  /** Fallback list: only assets that are actually "up there" (FE-1.4). */
  readonly orbitalAssets = computed(() =>
    this.assetService.assets().filter((a) => a.altitude_km > 100),
  );

  private viewer: any;

  ngAfterViewInit(): void {
    // Runs once after #globeEl exists in the DOM. Execution forks here on a
    // data-readiness check, and the two branches differ in TIMING:
    //   • assets already in the store (user visited 2D map first) -> initGlobe()
    //     runs SYNCHRONOUSLY, right now, on this same call stack.
    //   • store empty (3D tab opened first) -> kick off an ASYNC fetch and
    //     defer initGlobe() into the subscribe callback; this method returns
    //     immediately and the globe builds later, once data arrives.
    // Either way initGlobe() sees a populated store, so plotAssets() never
    // renders an empty globe.
    if (this.assetService.assets().length === 0) {
      this.assetService.loadGeoJson().subscribe(() => this.initGlobe());
    } else {
      this.initGlobe();
    }
  }

  ngOnDestroy(): void {
    // Cesium holds a WebGL context + RAF loop — destroy it explicitly.
    if (this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.destroy();
    }
  }

  /* ------------------------------------------------------------------ */

  /** Try to build the globe; fall back to the table on any failure. */
  private initGlobe(): void {
    // cesiumReady is still null on entry (template shows neither globe nor
    // table yet). Every exit path below MUST set it to true/false exactly once
    // — that signal is what flips the template from "loading" to globe/fallback.
    const Cesium = window.Cesium;

    // Step 1: feature-detect the global build. If the <script> never loaded,
    // bail BEFORE touching any Cesium API — set false and the template swaps in
    // the orbitalAssets table. Early return means Step 2 never runs.
    if (typeof Cesium === 'undefined') {
      this.cesiumReady.set(false);
      return;
    }

    // Step 2: construct the viewer defensively (WebGL may be unavailable).
    // The whole build runs in order — token, viewer, plot, camera — and any
    // throw at any point jumps to catch, leaving cesiumReady false (fallback).
    try {
      if (environment.cesiumIonToken) {
        Cesium.Ion.defaultAccessToken = environment.cesiumIonToken;
      }

      this.viewer = new Cesium.Viewer(this.globeEl.nativeElement, {
        // Strip the heavy default widgets — this is an embedded panel, not a full app.
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        fullscreenButton: false,
        infoBox: true,
        selectionIndicator: true,
      });

      this.plotAssets(Cesium);
      this.flyToIndia(); // start framed on the AOI
      this.cesiumReady.set(true);
    } catch (err) {
      // Any failure (no WebGL, asset load error, etc.) -> graceful fallback.
      console.warn('[Cesium] viewer init failed, using fallback table.', err);
      this.cesiumReady.set(false);
    }
  }

  /** Drop a labelled point for every asset at its true lon/lat/altitude. */
  private plotAssets(Cesium: any): void {
    for (const a of this.assetService.assets()) {
      this.viewer.entities.add({
        name: a.name,
        // Altitude is in km in our data; Cesium wants metres.
        position: Cesium.Cartesian3.fromDegrees(a.longitude, a.latitude, a.altitude_km * 1000),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString(a.color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: a.name,
          font: '12px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -18),
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(11,18,32,0.8)'),
          scale: 0.85,
        },
        description: `${a.asset_type} — ${a.status} — ${a.altitude_km} km`,
      });
    }
  }

  /* ------------------------------------------------------------------ *
   *  Camera controls (template buttons)
   * ------------------------------------------------------------------ */

  /** Frame the Indian subcontinent. */
  flyToIndia(): void {
    const Cesium = window.Cesium;
    if (!this.viewer || !Cesium) return;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(79, 22, 6_000_000),
      duration: 1.5,
    });
  }

  /** Pull the camera back to a full "space" view of the globe. */
  flyToSpace(): void {
    const Cesium = window.Cesium;
    if (!this.viewer || !Cesium) return;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(79, 22, 40_000_000),
      duration: 1.5,
    });
  }
}
