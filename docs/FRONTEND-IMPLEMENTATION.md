# ISSA POC — Frontend Developer Guide

> **One-line summary:** An Angular dashboard that shows defence assets (satellites, radars, ground
> stations, space debris) on a 2D OpenLayers map + 3D Cesium globe, with a searchable table, an add
> form, and an alerts panel — running entirely on **bundled mock JSON** (no backend required).

This is the onboarding document. Read it top-to-bottom and you'll understand the **business**, the
**routing**, and the **logic/data-flow** of the whole app. Every source file is also heavily
commented — this doc is the map, the comments are the detail.

---

## 1. Business context (what & why)

**Client:** Judge India Solutions → ISSA (Integrated Space Situational Awareness), a DRDO programme.
ISSA tracks defence assets and needs ONE web console to see *where assets are*, *their status*, and
*what alerts need attention* — replacing scattered spreadsheets.

**Core domain objects**

| Object | Meaning | Key fields |
|---|---|---|
| **Asset** | A tracked object | `name`, `asset_type`, `status`, `latitude`, `longitude`, `altitude_km`, `speed_kmph` |
| **Alert** | A warning about an asset | `asset_name`, `message`, `severity`, `acknowledged` |
| **User** | The operator signed in | `username`, `role`, `full_name` |

**Asset status drives colour everywhere** (map markers + table dot):
`active` = green · `critical` = red · `maintenance` = amber · `inactive` = grey.
**Alert severity drives the card border:** `critical` red · `high` amber · `medium` blue · `low` grey.

---

## 2. Tech stack

| Layer | Library | Notes |
|---|---|---|
| Framework | **Angular 20** | Standalone components, signals, no NgModules |
| UI kit | **PrimeNG 20** | `p-table`, `p-dialog`, `p-toast`, **`p-select`** (was `p-dropdown` in v17), `p-inputNumber`, `p-password` |
| Theme | `@primeuix/themes` (Aura) | Styled mode, configured in `app.config.ts` |
| 2D map | **OpenLayers 10** | The mandated map library — *not* Leaflet/Google Maps |
| 3D globe | **Cesium 1.142** | Loaded as a global `<script>` (`window.Cesium`) with a graceful fallback |
| Async/state | **RxJS + Angular signals** | Signals for view state, RxJS subjects for map↔table sync |

---

## 3. Run it

```bash
npm install
npm start          # ng serve -> http://localhost:4200  (development config, mock mode ON)
```

- **Login:** any non-empty credentials. The form is pre-filled with `admin` / `Admin@1234`.
- **Build:** `npx ng build` (production) · `npx ng build --configuration development` (dev).
- There is **no backend to run** — all data is read from `src/assets/mock-data/*.json`.

---

## 4. Current project structure

Only folders the app actually uses remain (the empty scaffold was removed). `core` = app-wide
singletons, `features` = one folder per screen/domain, `environments` = build-time config.

```
src/
├── index.html                      # loads Cesium global script + sets CESIUM_BASE_URL
├── main.ts                         # bootstraps App with appConfig
├── styles.scss                     # GLOBAL dark theme, tokens, OL popup styles  ← the real styling
├── styles/                         # SCSS architecture partials (compiled, mostly placeholders)
│
├── assets/mock-data/
│   ├── mock-assets.json            # 10 DRDO assets as a GeoJSON FeatureCollection
│   └── mock-alerts.json            # 3 alerts
│
└── app/
    ├── app.ts / app.html           # root shell: <p-toast> + <router-outlet>
    ├── app.config.ts               # providers: router, http+interceptor, animations, PrimeNG, toast
    ├── app.routes.ts               # ROOT route table (see §5)
    │
    ├── core/                       # app-wide, no UI of their own
    │   ├── services/auth.service.ts        # login / logout / isLoggedIn (signals + localStorage)
    │   ├── guards/auth-guard.ts            # CanActivateFn protecting /dashboard
    │   ├── interceptors/auth-interceptor.ts# adds "Authorization: Bearer <token>"
    │   ├── constants/asset.constants.ts    # status/severity colours + dropdown options
    │   └── models/user.model.ts            # auth + login types
    │
    ├── environments/               # environment.ts (+ development/staging/qa/production)
    │
    └── features/
        ├── authentication/
        │   ├── pages/login/                # dark reactive-form login
        │   └── routes.ts                   # AUTHENTICATION_ROUTES (lazy)
        ├── dashboard/
        │   ├── pages/dashboard/            # FE-2 layout: nav + 3-panel grid + 2D/3D toggle
        │   └── routes.ts                   # DASHBOARD_ROUTES (lazy, guarded)
        ├── assets/
        │   ├── services/asset.service.ts   # ★ SINGLE SOURCE OF TRUTH (store + sync streams)
        │   ├── models/asset.model.ts       # Asset + GeoJSON types + converters
        │   ├── components/asset-table/     # p-table: search, filter, row→map, actions
        │   └── dialogs/asset-form-dialog/  # add-asset form (validated)
        ├── map/components/map-view/         # OpenLayers map
        ├── alerts/
        │   ├── services/alert.service.ts   # load + acknowledge
        │   └── components/alerts-panel/    # severity cards + ACK + unread badge
        └── cesium/components/cesium-view/   # 3D globe + fallback table
```

> Only `authentication` and `dashboard` are **routed** features. `assets`, `map`, `alerts`, `cesium`
> are **component** features — the dashboard imports their components directly (so they have no
> `routes.ts`).

---

## 5. Routing (how navigation works)

### The route table — [src/app/app.routes.ts](../src/app/app.routes.ts)

```
/            → redirect → /login
/login       → AUTHENTICATION_ROUTES   (public,    lazy chunk "login")
/dashboard   → DASHBOARD_ROUTES        (guarded,   lazy chunk "dashboard")  ← canActivate: [authGuard]
**           → redirect → /login        (unknown URLs fall back to login)
```

- **Lazy loading:** each feature is pulled in with `loadChildren` → its own JS chunk, loaded only
  when first visited. `app.routes.ts` → `features/<x>/routes.ts` → `loadComponent(...)`.
- **The guard** — [auth-guard.ts](../src/app/core/guards/auth-guard.ts): a functional `CanActivateFn`.
  If `AuthService.isLoggedIn()` is false it returns a `UrlTree` to `/login`, cancelling the
  navigation. This is the only thing stopping a logged-out user reaching `/dashboard`.

### End-to-end auth flow

```
 LoginComponent.onSubmit()
   └─ AuthService.login(creds)
        ├─ mockMode? → returns a fixed { token:'mock-jwt-token', user:{role:'admin', …} }
        └─ live?     → POST /api/auth/login
        └─ persistSession(): writes token+user to localStorage, sets the `user` signal
   └─ router.navigate(['/dashboard'])
        └─ authGuard runs → isLoggedIn() === true → allowed ✓

 Every HTTP call afterwards:
   authInterceptor reads AuthService.token → adds "Authorization: Bearer <token>"

 Logout (nav bar):
   AuthService.logout() clears localStorage + signal → router.navigate(['/login'])
   → next /dashboard visit is blocked by the guard
```

Session **survives refresh**: `AuthService` rehydrates the `user` signal from localStorage on
construction.

---

## 6. Logic & data flow (the important part)

### `AssetService` is the hub — [asset.service.ts](../src/app/features/assets/services/asset.service.ts)

It is the **single source of truth** that keeps the **map** and the **table** in sync. It exposes:

| Member | Type | Who consumes it |
|---|---|---|
| `assets` | `signal<Asset[]>` | Table + Cesium read this reactively |
| `added$` | `Subject<Asset>` | Map → drops a new marker |
| `removed$` | `Subject<number>` | Map → removes a marker |
| `selected$` | `Subject<Asset>` | Map → pans/animates to the asset |

```
                          ┌──────────────── AssetService ────────────────┐
   loadGeoJson() ─HTTP──► │ assets: signal<Asset[]>                       │
                          │ added$ / removed$ / selected$  (event streams)│
                          └───────────────────────────────────────────────┘
        ▲ reads GeoJSON once          ▲ reads signal                ▲ subscribes to streams
   ┌────┴─────┐                  ┌────┴──────┐                 ┌─────┴──────┐
   │ Map view │                  │  Table    │                 │  Map view  │
   └──────────┘                  └───────────┘                 └────────────┘

   Table row click ─ selectAsset() ─► selected$ ─► Map.panTo()
   Add form save  ─ addAsset()    ─► added$    ─► Map adds marker (appears instantly)
   Table trash    ─ removeAsset() ─► removed$  ─► Map removes marker
```

**Why two mechanisms (signal + subjects)?** The table needs the *current list* (a signal is perfect:
declarative, auto-recomputing). The map needs *incremental events* ("add THIS marker") so it doesn't
rebuild the whole vector layer on every change — that's what the RxJS subjects deliver.

### Debounced search — [asset-table.ts](../src/app/features/assets/components/asset-table/asset-table.ts)

```
keystroke → searchInput$ (Subject) → debounceTime(300) → distinctUntilChanged → search.set(term)
                                                                                      │
                          filtered = computed(assets ▸ status filter ▸ name contains) ◄┘
```

So we filter the **local array once** after the user pauses — never per keystroke. (In live mode this
is exactly where a single `GET /api/assets?search=` call would fire.)

### Component responsibilities at a glance

| Component | Logic it owns |
|---|---|
| [map-view](../src/app/features/map/components/map-view/map-view.ts) | Builds OL map (OSM + Satellite layers), styles markers by status, click→popup (`ol/Overlay`), layer switch, Fit-all; subscribes to `added$/removed$/selected$` |
| [asset-table](../src/app/features/assets/components/asset-table/asset-table.ts) | `p-table` of the `assets` signal; debounced search; status filter; row click → `selectAsset`; eye → detail dialog; trash → `removeAsset`; hosts the add dialog |
| [asset-form-dialog](../src/app/features/assets/dialogs/asset-form-dialog/asset-form-dialog.ts) | Reactive form with validation (lat ±90, lon ±180); on save → `addAsset()` |
| [alerts-panel](../src/app/features/alerts/components/alerts-panel/alerts-panel.ts) | Loads alerts, sorts by severity; ACK → `acknowledge()` + flips flag locally; unread badge = computed |
| [cesium-view](../src/app/features/cesium/components/cesium-view/cesium-view.ts) | Feature-detects `window.Cesium`; plots assets at true altitude; India/Space camera buttons; **fallback table** if globe unavailable |
| [dashboard](../src/app/features/dashboard/pages/dashboard/dashboard.ts) | Top nav (active chip, 2D/3D toggle, user, logout) + `220px 1fr 380px` grid; keeps the 2D map mounted, lazy-mounts Cesium |

---

## 7. Mock ↔ Live switch (one flag)

`src/app/environments/environment.ts` → **`mockMode`**:

- `true`  → services read `assets/mock-data/*.json`  (current default, no backend)
- `false` → services call the live REST API at `apiUrl`

The live-mode HTTP calls are **already written and commented** in `AssetService`, `AlertService`,
and `AuthService`. To integrate a backend: set `mockMode: false`, point `apiUrl` at the server —
nothing else changes. Build configs swap the environment file via `fileReplacements` in `angular.json`
(`development` → mock ON; `staging`/`qa`/`production` → mock OFF).

---

## 8. Cesium specifics (why it never crashes)

- Cesium is **not** imported as a module. It's loaded by a `<script>` in `index.html` from `/cesium/*`
  (copied from `node_modules/cesium/Build/Cesium` by the `angular.json` assets glob).
- `CesiumViewComponent` does: (1) check `typeof window.Cesium !== 'undefined'`, then (2) build the
  viewer inside `try/catch`. If either fails (files missing, no WebGL), it renders a **fallback table**
  of orbital assets (`altitude_km > 100`). The app keeps working regardless.

---

## 9. Where each assignment requirement lives (FE-3 checklist)

| Requirement | File |
|---|---|
| 10 markers coloured by status | `map-view.ts` → `markerStyle`, `loadAssets` |
| Click marker → popup | `map-view.ts` → `onSelect` + `.ol-asset-popup` (in `styles.scss`) |
| Debounced search | `asset-table.ts` → `searchInput` pipe |
| Row click pans map | `asset-table.ts` `onRowClick` → `selected$` → `map-view.panTo` |
| Add form → marker appears instantly | `asset-form-dialog.ts` → `addAsset()` → `added$` |
| Alerts: 3 cards, colours, ACK | `alerts-panel.*` + `SEVERITY_COLORS` |
| Cesium globe or fallback (no crash) | `cesium-view.ts` |
| 3-panel grid + 52px nav | `dashboard.scss` `.dash__body` / `.dash__nav` |

---

## 10. Conventions for new code

- **Standalone everything** — add new UI as a standalone component; register providers in
  `app.config.ts` (there is no AppModule).
- **State:** prefer **signals** for view state; use the `AssetService` streams for cross-component
  events. Don't add a new global store unless a feature genuinely needs one.
- **New routed feature:** create `features/<x>/routes.ts` exporting `<X>_ROUTES`, then add a
  `loadChildren` entry in `app.routes.ts` (guard it with `authGuard` if it's behind login).
- **Colours/options:** add to `core/constants/asset.constants.ts` — never hard-code a hex in a
  template, so map and table stay consistent.
- **CLI commands** for generating files: see [ANGULAR-CLI-COMMANDS.md](ANGULAR-CLI-COMMANDS.md).
