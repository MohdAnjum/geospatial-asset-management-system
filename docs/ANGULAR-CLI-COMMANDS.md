# Angular CLI Command Reference — Geospatial Asset Management System

Angular **20** (standalone APIs, `@angular/build` esbuild builder).
All artifacts are **standalone** by default — no `--standalone` flag, and there are **no NgModules**.
Tests are skipped per the `schematics` config in `angular.json`.

> Run every command from the project root. On Windows PowerShell prefer `npx ng …`.
> The `npm start` / `npm run build` aliases work too, but pass extra flags through `npx ng …`
> to avoid `npm run` argument-forwarding quirks.

For the architecture / routing / data-flow explanation, see
[FRONTEND-IMPLEMENTATION.md](FRONTEND-IMPLEMENTATION.md). This file is just the commands.

---

## 1. Project lifecycle

| Action | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Serve (dev, mock mode ON) | `npx ng serve` → http://localhost:4200 (defaults to `development`) |
| Serve a specific env | `npx ng serve --configuration staging` (or `qa`, `production`) |
| Serve on a custom port | `npx ng serve --port 4300 --open` |
| Build (prod, default) | `npx ng build` |
| Build a specific env | `npx ng build --configuration development` |
| Build + watch | `npx ng build --watch --configuration development` |
| Unit tests | `npx ng test` |
| List CLI help | `npx ng --help` · per-command: `npx ng generate component --help` |

### Environments & file replacement

`src/app/environments/environment.ts` is the import token; `angular.json` swaps it per build
configuration via `fileReplacements`. The key field is **`mockMode`** (true = bundled JSON,
false = live API).

| Configuration | File used | mockMode |
| --- | --- | --- |
| `development` | `environment.development.ts` | `true` |
| `staging` | `environment.staging.ts` | `false` |
| `qa` | `environment.qa.ts` | `false` |
| `production` | `environment.production.ts` | `false` |

Import with: `import { environment } from '../environments/environment';` (adjust depth).

---

## 2. `ng generate` — aliases & flags

`g` = `generate`. Common aliases: `c` component · `s` service · `d` directive · `p` pipe ·
`g` guard · `i` interface · `cl` class · `e` enum.

Useful flags:
- `--dry-run` (`-d`) — preview without writing. **Use first.**
- `--skip-tests` — already the default here.
- `--flat` — don't create a wrapping folder (for plain TS files).
- `--type=''` — drop the type suffix (e.g. `auth.ts` instead of `auth.service.ts`).

> Pass **path + name** as one argument: `npx ng g c features/assets/components/asset-map`.
> The CLI creates the component folder for you.

---

## 3. Current structure (what exists today)

```
src/app/
├── core/
│   ├── services/        auth.service.ts
│   ├── guards/          auth-guard.ts
│   ├── interceptors/    auth-interceptor.ts
│   ├── constants/       asset.constants.ts
│   └── models/          user.model.ts
├── environments/        environment(.development|.staging|.qa|.production).ts
└── features/
    ├── authentication/  pages/login/            + routes.ts   (lazy, public)
    ├── dashboard/       pages/dashboard/         + routes.ts   (lazy, guarded)
    ├── assets/          services/ models/ components/asset-table/ dialogs/asset-form-dialog/
    ├── map/             components/map-view/
    ├── alerts/          services/ models/ components/alerts-panel/
    └── cesium/          components/cesium-view/
```

Only `authentication` and `dashboard` are **routed**; the rest are component features the dashboard
imports directly.

---

## 4. Commands that produced the current files

Reference for how each existing artifact maps to a CLI command (re-runnable for new ones):

```bash
# --- core ---
npx ng g s core/services/auth
npx ng g guard core/guards/auth                 # choose CanActivate
npx ng g interceptor core/interceptors/auth
npx ng g i core/models/user --flat --type=model

# --- authentication (routed) ---
npx ng g c features/authentication/pages/login

# --- dashboard (routed) ---
npx ng g c features/dashboard/pages/dashboard

# --- assets ---
npx ng g s features/assets/services/asset
npx ng g i features/assets/models/asset --flat --type=model
npx ng g c features/assets/components/asset-table
npx ng g c features/assets/dialogs/asset-form-dialog

# --- map / alerts / cesium ---
npx ng g c features/map/components/map-view
npx ng g s features/alerts/services/alert
npx ng g i features/alerts/models/alert --flat --type=model
npx ng g c features/alerts/components/alerts-panel
npx ng g c features/cesium/components/cesium-view
```

> `core/constants/asset.constants.ts` is a plain file (no schematic) — create it directly or with
> `npx ng g cl core/constants/asset --flat --type=constant` and rename.

---

## 5. Extending the app

### Add a new routed feature (e.g. `reports`)

```bash
npx ng g c features/reports/pages/report-list      # the page component
```

Create `features/reports/routes.ts`:
```ts
import { Routes } from '@angular/router';
export const REPORTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/report-list/report-list').then(m => m.ReportListComponent) },
];
```

Wire it in `src/app/app.routes.ts` (guard it if it's behind login):
```ts
{
  path: 'reports',
  canActivate: [authGuard],
  loadChildren: () => import('./features/reports/routes').then(m => m.REPORTS_ROUTES),
},
```

### Add a component feature (no route — imported by another component)

```bash
npx ng g c features/<feature>/components/<name>
```
Then add it to the importing component's standalone `imports: [...]` and place its selector in that
component's template. (This is how `map-view`, `alerts-panel`, etc. are wired into the dashboard.)

### Add a service / model / guard

```bash
npx ng g s features/<feature>/services/<name>
npx ng g i features/<feature>/models/<name> --flat --type=model
npx ng g guard core/guards/<name>
```

---

## 6. Styles (`src/styles.scss` + `src/styles/`)

Pure SCSS — no generator. The real global styling (dark theme, tokens, OpenLayers popup) lives in
**`src/styles.scss`**. `src/styles/styles.scss` is an optional partial architecture
(`abstracts → base → themes → layout → components → pages → utilities`); both are registered in
`angular.json` `styles[]`. Add a partial as `_name.scss` and `@forward` it from the folder's
`_index.scss`.

---

## 7. Library / tooling add-ons (optional)

```bash
npx ng add @angular/eslint        # linting
npx ng update @angular/core @angular/cli   # stay current within v20
```

PrimeNG / OpenLayers / Cesium are already installed. Note PrimeNG 20 renamed `p-dropdown` → `p-select`.

---

## 8. Project-specific notes

- **No NgModules** — providers live in `src/app/app.config.ts`.
- **Tests skipped** by default (`skipTests` in `angular.json`); drop the flag to generate specs.
- **Assets:** `src/assets/**` → `/assets`, and Cesium is copied `node_modules/cesium/Build/Cesium` →
  `/cesium` (both in `angular.json`). `public/**` is served at the web root.
- **No backend needed** — `mockMode` is on in `development`; data comes from `src/assets/mock-data/`.
