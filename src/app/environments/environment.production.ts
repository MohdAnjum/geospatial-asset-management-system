/** Production environment — live API, mock mode OFF. */
export const environment = {
  production: true,
  name: 'production',

  apiUrl: 'https://api.example.com/api',
  mockMode: false,

  mockAssetsUrl: 'assets/mock-data/mock-assets.json',
  mockAlertsUrl: 'assets/mock-data/mock-alerts.json',

  osmTileUrl: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satelliteTileUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

  cesiumBaseUrl: '/cesium/',
  cesiumIonToken: '',
};
