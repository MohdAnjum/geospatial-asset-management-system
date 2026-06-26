/**
 * ============================================================================
 *  ASSET DOMAIN MODEL
 * ============================================================================
 *  A "Asset" is any tracked defence object in the ISSA system: a satellite,
 *  ground station, radar installation, space debris, or observation post.
 *
 *  Two shapes exist in this app and it is important to keep them straight:
 *
 *   1. GeoJSON  (AssetFeatureCollection) — the wire/file format. This is what
 *      `mock-assets.json` contains and what the real backend's
 *      `GET /api/assets/geojson` returns. OpenLayers consumes this format
 *      directly. Coordinates are [longitude, latitude, altitude] (lon FIRST).
 *
 *   2. Asset (flat object) — the UI-friendly format used by the PrimeNG table,
 *      the add-asset form, and the Cesium fallback list. Latitude / longitude
 *      are separate named fields so templates can bind to them easily.
 *
 *  `assetFromFeature()` / `featureToAsset()` below convert between the two so
 *  the rest of the app never has to dig into nested GeoJSON by hand.
 * ============================================================================
 */

/** The four operational states an asset can be in (matches the DB enum). */
export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'critical';

/** The asset categories selectable in the add-asset form. */
export type AssetType =
  | 'Satellite'
  | 'Ground Station'
  | 'Radar'
  | 'Space Debris'
  | 'Observation Post';

/** Flat, UI-friendly representation of an asset (used by table / form / list). */
export interface Asset {
  id: number;
  name: string;
  asset_type: string;
  status: AssetStatus;
  /** Orbital / ground altitude in kilometres (0 for ground assets). */
  altitude_km: number;
  /** Ground speed in km/h (0 for stationary / geostationary assets). */
  speed_kmph: number;
  /** Per-asset brand colour shipped in the data (distinct from status colour). */
  color: string;
  latitude: number;
  longitude: number;
}

/* -------------------------------------------------------------------------- *
 *  GeoJSON types (RFC 7946 subset) — only the parts we actually use.
 * -------------------------------------------------------------------------- */

/** Properties block carried inside each GeoJSON feature. */
export interface AssetProperties {
  id: number;
  name: string;
  asset_type: string;
  status: AssetStatus;
  altitude_km: number;
  speed_kmph: number;
  color: string;
}

/** A single GeoJSON point feature representing one asset. */
export interface AssetFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    /** [longitude, latitude, altitude] — longitude is ALWAYS first. */
    coordinates: [number, number, number];
  };
  properties: AssetProperties;
}

/** Top-level GeoJSON document — a collection of asset features. */
export interface AssetFeatureCollection {
  type: 'FeatureCollection';
  features: AssetFeature[];
}

/* -------------------------------------------------------------------------- *
 *  Conversion helpers
 * -------------------------------------------------------------------------- */

/** Flatten one GeoJSON feature into the UI-friendly {@link Asset} shape. */
export function assetFromFeature(feature: AssetFeature): Asset {
  const [longitude, latitude] = feature.geometry.coordinates;
  return { ...feature.properties, latitude, longitude };
}

/** Flatten an entire GeoJSON collection into an array of {@link Asset}. */
export function assetsFromCollection(collection: AssetFeatureCollection): Asset[] {
  return collection.features.map(assetFromFeature);
}

/** Build a GeoJSON feature from a flat {@link Asset} (used when adding one). */
export function featureFromAsset(asset: Asset): AssetFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [asset.longitude, asset.latitude, asset.altitude_km],
    },
    properties: {
      id: asset.id,
      name: asset.name,
      asset_type: asset.asset_type,
      status: asset.status,
      altitude_km: asset.altitude_km,
      speed_kmph: asset.speed_kmph,
      color: asset.color,
    },
  };
}
