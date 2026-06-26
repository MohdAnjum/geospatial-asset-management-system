/**
 * Development environment — used by `ng serve` (default configuration).
 * Mock mode is ON so the whole app runs without a backend.
 */
export const environment = {
  production: false,
  name: 'development',

  apiUrl: 'http://localhost:3000/api',
  mockMode: true,

  mockAssetsUrl: 'assets/mock-data/mock-assets.json',
  mockAlertsUrl: 'assets/mock-data/mock-alerts.json',

  osmTileUrl: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satelliteTileUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

  cesiumBaseUrl: '/cesium/',
  cesiumIonToken: '',
};
