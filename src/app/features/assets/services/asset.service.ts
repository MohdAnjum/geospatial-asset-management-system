/**
 * ============================================================================
 *  ASSET SERVICE  (the app's single source of truth for assets)
 * ============================================================================
 *  This service is the hub that keeps the OpenLayers MAP and the PrimeNG TABLE
 *  in sync — the "BehaviorSubject for map-table sync" the assignment calls for.
 *
 *  WHO READS WHAT
 *  --------------
 *   - Table & Cesium fallback : read the `assets` SIGNAL (reactive list).
 *   - Map (OpenLayers)        : loads the raw GeoJSON once, then listens to the
 *                               event streams below to stay in sync without
 *                               rebuilding the whole vector layer.
 *
 *  EVENT STREAMS (one-way notifications the map subscribes to)
 *   - added$    : a new asset was created  -> map adds a marker
 *   - removed$  : an asset was deleted      -> map removes that marker
 *   - selected$ : a table row was clicked   -> map pans/animates to that asset
 *
 *  MODE SWITCH
 *   - mockMode true  -> GeoJSON comes from the bundled JSON; create/delete are
 *                       purely in-memory (no API), which is all Hours 1-4 need.
 *   - mockMode false -> swap the URLs for the live endpoints (Hour 5). The
 *                       commented branches show exactly what to call.
 * ============================================================================
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Asset,
  AssetFeatureCollection,
  assetsFromCollection,
} from '../models/asset.model';

/** Shape the add-asset form submits (everything except the generated id). */
export type NewAsset = Omit<Asset, 'id'>;

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly http = inject(HttpClient);

  /** Reactive list backing the table / fallback list. */
  private readonly assetsSig = signal<Asset[]>([]);
  readonly assets = this.assetsSig.asReadonly();

  /** Event streams the map subscribes to (see class docs). */
  private readonly addedSubject = new Subject<Asset>();
  readonly added$ = this.addedSubject.asObservable();

  private readonly removedSubject = new Subject<number>();
  readonly removed$ = this.removedSubject.asObservable();

  private readonly selectedSubject = new Subject<Asset>();
  readonly selected$ = this.selectedSubject.asObservable();

  /** Auto-incrementing id for assets created locally in mock mode. */
  private nextLocalId = 1000;

  /* ------------------------------------------------------------------ *
   *  LOAD
   * ------------------------------------------------------------------ */

  /**
   * Fetch the asset GeoJSON. The MAP consumes the returned FeatureCollection
   * directly (OpenLayers reads GeoJSON natively). As a side effect we also
   * flatten it into the `assets` signal so the TABLE has its data too — one
   * fetch feeds both views.
   */
  loadGeoJson(): Observable<AssetFeatureCollection> {
    const url = environment.mockMode
      ? environment.mockAssetsUrl
      : `${environment.apiUrl}/assets/geojson`;

    return this.http
      .get<AssetFeatureCollection>(url)
      .pipe(tap((collection) => this.assetsSig.set(assetsFromCollection(collection))));
  }

  /**
   * LIVE-MODE helper (Hour 5): server-side search/filter for the table.
   * In mock mode the table filters the local array instead, so this is unused
   * until the backend is connected.
   */
  getAll(status?: string, search?: string): Observable<{ data: Asset[] }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<{ data: Asset[] }>(`${environment.apiUrl}/assets`, { params });
  }

  /* ------------------------------------------------------------------ *
   *  CREATE
   * ------------------------------------------------------------------ */

  /**
   * Add an asset. In mock mode we generate an id locally, push it into the
   * store, and emit `added$` so the map drops a marker immediately (FE-1.4:
   * "the marker appears on the map immediately").
   *
   * For live mode, replace the body with a POST and push the server's response.
   */
  addAsset(input: NewAsset): Asset {
    // --- LIVE MODE (Hour 5) would be:
    // return this.http.post<Asset>(`${environment.apiUrl}/assets`, input)
    //   .pipe(tap(saved => { this.assetsSig.update(l => [...l, saved]); this.addedSubject.next(saved); }))
    const asset: Asset = { ...input, id: ++this.nextLocalId };
    this.assetsSig.update((list) => [...list, asset]);
    this.addedSubject.next(asset);
    return asset;
  }

  /* ------------------------------------------------------------------ *
   *  DELETE
   * ------------------------------------------------------------------ */

  /** Remove an asset from the store and tell the map to drop its marker. */
  removeAsset(id: number): void {
    // --- LIVE MODE (Hour 5): this.http.delete(`${environment.apiUrl}/assets/${id}`).subscribe(...)
    this.assetsSig.update((list) => list.filter((a) => a.id !== id));
    this.removedSubject.next(id);
  }

  /* ------------------------------------------------------------------ *
   *  SELECT (table row -> map pan)
   * ------------------------------------------------------------------ */

  /** Broadcast a selection so the map animates to the chosen asset. */
  selectAsset(asset: Asset): void {
    this.selectedSubject.next(asset);
  }
}
