/**
 * ============================================================================
 *  BASE / DEFAULT ENVIRONMENT
 * ============================================================================
 *  This is the token Angular resolves at build time. `fileReplacements` in
 *  angular.json swaps this file for the matching target (development | staging
 *  | qa | production) per build configuration.
 *
 *  KEY FLAG — `mockMode`:
 *    true  -> services read from the bundled JSON files in src/assets/mock-data
 *             (Hours 1-4 of the assignment, no backend needed).
 *    false -> services call the live REST API at `apiUrl` (Hour 5 integration).
 *
 *  Because the assignment's Hours 1-4 run entirely against mock data, mockMode
 *  ships as `true`. Flip it to `false` once the backend is up to go live.
 * ============================================================================
 */
export const environment = {
  production: false,
  name: 'default',

  /** Live REST API base (used only when mockMode is false). */
  apiUrl: 'http://localhost:3000/api',
  /** Master switch between bundled JSON and the live API. */
  mockMode: true,

  /** Bundled mock data sources (served from /assets at runtime). */
  mockAssetsUrl: 'assets/mock-data/mock-assets.json',
  mockAlertsUrl: 'assets/mock-data/mock-alerts.json',

  /** OpenStreetMap raster tiles — the default 2D base map. */
  osmTileUrl: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** Esri / ArcGIS World Imagery — the satellite base map (layer switcher). */
  satelliteTileUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

  /** Where the copied Cesium static assets live (see angular.json + index.html). */
  cesiumBaseUrl: '/cesium/',
  /** Optional Cesium Ion token for premium imagery (blank = offline globe). */
  cesiumIonToken: '',
};
