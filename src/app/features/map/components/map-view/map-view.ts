/**
 * ============================================================================
 *  MAP VIEW  (OpenLayers 2D map — the primary deliverable, FE-1.2)
 * ============================================================================
 *  Renders all assets as coloured markers on an interactive map and wires up
 *  click selection, a base-layer switcher, and a "Fit all" control.
 *
 *  LAYER STACK (bottom -> top)
 *   1. OSM TileLayer        — default street base map (visible)
 *   2. Satellite TileLayer  — Esri World Imagery via XYZ (hidden until toggled)
 *   3. Vector marker layer  — one point feature per asset, styled by status
 *
 *  DATA FLOW
 *   - On init we ask AssetService for the GeoJSON and let OpenLayers parse it
 *     straight into features (reprojected lon/lat -> Web Mercator).
 *   - We then SUBSCRIBE to the service's event streams so the map stays live:
 *       added$    -> append a marker          (after add-asset form submits)
 *       removed$  -> delete a marker          (after table trash action)
 *       selected$ -> animate/pan to an asset  (after table row click)
 *
 *  SELECTION POPUP
 *   - An ol/Overlay anchored to the clicked marker shows name/type/status/
 *     altitude. Its DOM lives in the template (#popup) and is styled globally
 *     as `.ol-asset-popup` in styles.scss.
 * ============================================================================
 */
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import type { FeatureLike } from 'ol/Feature';
import type { StyleLike } from 'ol/style/Style';

import { AssetService } from '../../../assets/services/asset.service';
import { Asset, featureFromAsset } from '../../../assets/models/asset.model';
import { statusColor } from '../../../../core/constants/asset.constants';
import { environment } from '../../../../environments/environment';

/** Minimal view-model the popup template binds to. */
interface PopupInfo {
  name: string;
  type: string;
  status: string;
  altitude: number;
}

/** Web-Mercator projection key used for all on-map geometry. */
const MAP_PROJECTION = 'EPSG:3857';
/** Lon/lat projection key used by GeoJSON / our source data. */
const DATA_PROJECTION = 'EPSG:4326';

@Component({
  selector: 'app-map-view',
  imports: [],
  templateUrl: './map-view.html',
  styleUrl: './map-view.scss',
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  private readonly assetService = inject(AssetService);
  private readonly destroyRef = inject(DestroyRef);

  /** The div OpenLayers renders into. */
  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;
  /** The floating popup element attached to an ol/Overlay. */
  @ViewChild('popupEl', { static: true }) private popupEl!: ElementRef<HTMLDivElement>;

  /** Data shown inside the selection popup (null = hidden). */
  readonly popup = signal<PopupInfo | null>(null);
  /** Which base layer is active — drives the active state of the switch buttons. */
  readonly activeBase = signal<'osm' | 'satellite'>('osm');

  // OpenLayers objects kept as fields so event handlers can reach them.
  private map!: Map;
  private osmLayer!: TileLayer<OSM>;
  private satelliteLayer!: TileLayer<XYZ>;
  private assetSource!: VectorSource;
  private overlay!: Overlay;
  private select!: Select;

  /* ================================================================== *
   *  LIFECYCLE
   * ================================================================== */

  ngAfterViewInit(): void {
    // Runs once, AFTER the template (#mapEl/#popupEl) exists in the DOM — that's
    // why this is ngAfterViewInit and not the constructor: OpenLayers needs the
    // real <div> to render into. The three calls run in a strict order:
    //   1. buildMap()       — synchronous; creates map + empty marker source.
    //   2. loadAssets()     — kicks off an ASYNC GeoJSON fetch; the source is
    //                         still empty when this returns. Markers appear
    //                         later, inside the subscribe() callback.
    //   3. wireStoreEvents()— attaches subscriptions so any future add/remove/
    //                         select from the service mutates the (now live) map.
    // Steps 2 and 3 both depend on the source/map built in step 1.
    this.buildMap();
    this.loadAssets();
    this.wireStoreEvents();
  }

  ngOnDestroy(): void {
    // Release the WebGL/canvas context and DOM listeners OpenLayers created.
    this.map?.setTarget(undefined);
  }

  /* ================================================================== *
   *  MAP CONSTRUCTION
   * ================================================================== */

  private buildMap(): void {
    // Base layers --------------------------------------------------------
    this.osmLayer = new TileLayer({ source: new OSM(), visible: true });
    this.satelliteLayer = new TileLayer({
      source: new XYZ({
        url: environment.satelliteTileUrl,
        attributions: 'Imagery © Esri',
        maxZoom: 19,
      }),
      visible: false, // hidden until the user switches to it
    });

    // Marker layer (empty for now; features are added in loadAssets) -----
    this.assetSource = new VectorSource();
    const assetLayer = new VectorLayer({
      source: this.assetSource,
      style: this.markerStyle as StyleLike,
    });

    // The map itself, centred over India --------------------------------
    this.map = new Map({
      target: this.mapEl.nativeElement,
      layers: [this.osmLayer, this.satelliteLayer, assetLayer],
      view: new View({
        center: fromLonLat([79, 22]), // ~centre of India
        zoom: 4.5,
      }),
    });

    // Selection popup overlay -------------------------------------------
    this.overlay = new Overlay({
      element: this.popupEl.nativeElement,
      positioning: 'bottom-center',
      stopEvent: true, // let clicks inside the popup work (e.g. the close ✕)
      offset: [0, -14],
    });
    this.map.addOverlay(this.overlay);

    // Click-to-select interaction ---------------------------------------
    this.select = new Select({ condition: click, style: this.markerStyle as StyleLike });
    this.map.addInteraction(this.select);
    this.select.on('select', (e) => this.onSelect(e.selected[0]));
  }

  /**
   * Style callback OpenLayers invokes per feature/zoom. A coloured circle whose
   * fill encodes status, plus the asset name as a label above the marker.
   */
  private markerStyle = (feature: FeatureLike): Style => {
    const status = feature.get('status') as string;
    const name = feature.get('name') as string;
    return new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: statusColor(status) }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
      text: new Text({
        text: name,
        offsetY: -16,
        font: '600 11px Segoe UI, sans-serif',
        fill: new Fill({ color: '#e6edf6' }),
        stroke: new Stroke({ color: '#0b1220', width: 3 }), // halo for legibility
      }),
    });
  };

  /* ================================================================== *
   *  DATA LOADING
   * ================================================================== */

  private loadAssets(): void {
    // loadGeoJson() returns a cold Observable: nothing happens until subscribe()
    // below. Execution leaves this method immediately; the callback runs later,
    // once the data arrives (one emission, then the stream completes).
    this.assetService
      .loadGeoJson()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((collection) => {
        // --- Runs asynchronously when the GeoJSON resolves ---
        // Let OpenLayers parse GeoJSON directly, reprojecting lon/lat -> mercator.
        const features = new GeoJSON().readFeatures(collection, {
          dataProjection: DATA_PROJECTION,
          featureProjection: MAP_PROJECTION,
        });
        console.log(`MapView: loaded ${features.length} features from GeoJSON`);
        // Adding features to the source triggers OpenLayers to re-render the
        // marker layer (and call markerStyle() per feature) on the next frame.
        this.assetSource.addFeatures(features);
        this.fitAll(); // now that the source has an extent, frame everything once
      });
  }

  /** Subscribe to store mutations so the map mirrors the table/form/etc. */
  private wireStoreEvents(): void {
    // None of these callbacks run now. Each subscribe() just registers a handler
    // that fires LATER, every time the service pushes onto that stream from
    // elsewhere in the app (form submit, table action). takeUntilDestroyed
    // auto-unsubscribes all three when this component is destroyed.

    // New asset created -> drop a marker immediately.
    this.assetService.added$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((asset) => this.assetSource.addFeature(this.toOlFeature(asset)));

    // Asset deleted -> remove its marker.
    this.assetService.removed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        const feature = this.assetSource.getFeatures().find((f) => f.get('id') === id);
        if (feature) this.assetSource.removeFeature(feature);
      });

    // Table row clicked -> pan/zoom to that asset.
    this.assetService.selected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((asset) => this.panTo(asset));
  }

  /** Build an OpenLayers feature (in map projection) from a flat Asset. */
  private toOlFeature(asset: Asset): Feature {
    return new GeoJSON().readFeature(featureFromAsset(asset), {
      dataProjection: DATA_PROJECTION,
      featureProjection: MAP_PROJECTION,
    }) as Feature;
  }

  /* ================================================================== *
   *  INTERACTIONS  (template-facing)
   * ================================================================== */

  /** Switch the visible base map. */
  showBase(which: 'osm' | 'satellite'): void {
    this.osmLayer.setVisible(which === 'osm');
    this.satelliteLayer.setVisible(which === 'satellite');
    this.activeBase.set(which);
  }

  /** Zoom/pan so every marker is in view, with padding (FE-1.2 "Fit All"). */
  fitAll(): void {
    const extent = this.assetSource.getExtent();
    // getExtent() is null / [Infinity, ...] when the source is empty — guard both.
    if (!extent || !isFinite(extent[0])) return;
    this.map.getView().fit(extent, { padding: [60, 60, 60, 60], duration: 500, maxZoom: 7 });
  }

  /** Close the selection popup. */
  closePopup(): void {
    this.popup.set(null);
    this.overlay.setPosition(undefined);
    this.select.getFeatures().clear();
  }

  /* ================================================================== *
   *  Internals
   * ================================================================== */

  /** Handle a marker click: position + populate the popup (or hide it). */
  private onSelect(feature: Feature | undefined): void {
    if (!feature) {
      this.closePopup();
      return;
    }
    const geometry = feature.getGeometry() as Point;
    this.overlay.setPosition(geometry.getCoordinates());
    this.popup.set({
      name: feature.get('name'),
      type: feature.get('asset_type'),
      status: feature.get('status'),
      altitude: feature.get('altitude_km'),
    });
  }

  /** Smoothly move the view to an asset's location. */
  private panTo(asset: Asset): void {
    this.map.getView().animate({
      center: fromLonLat([asset.longitude, asset.latitude]),
      zoom: 6,
      duration: 600,
    });
  }
}
