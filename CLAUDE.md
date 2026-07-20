# CLAUDE.md

This file guides Claude Code when working in this repository.

## Project

**Fairway** — a client-side golf performance dashboard (React 19 + TypeScript + Vite). All data lives in the browser's LocalStorage; there is no backend. Deployed to GitHub Pages at https://garund9-hash.github.io/golf-dashboard-v3/.

## Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc -b + vite build → dist/
npm run preview  # Serve the production build locally
npm run lint     # oxlint
```

Type-check only (no emit): `npx tsc -p tsconfig.app.json --noEmit`.

## Architecture

- **State**: A single `GolfProvider` ([src/context/GolfContext.tsx](src/context/GolfContext.tsx)) holds all app state (`rounds`, `profile`, `toasts`) and exposes mutators (`addRound`, `updateRound`, `deleteRound`, `addRounds`, `updateProfile`, `resetToSeed`, `pushToast`). Consume it via the `useGolf()` hook. There is no other global store.
- **Persistence**: [src/lib/storage.ts](src/lib/storage.ts) reads/writes LocalStorage. Keys are versioned (`golf-dashboard-v3-rounds-v3`, `...-profile-v3`); **bump the version suffix when the seed data shape changes** so users pick up new seeds. Legacy keys are cleared on load.
- **Derived data**: The `profile` (handicap + goal progress) is recomputed from rounds via `syncProfileFromRounds` on every rounds mutation — do not persist handicap/goals independently. Stats/insights are pure functions in [src/lib/stats.ts](src/lib/stats.ts) and [src/lib/insights.ts](src/lib/insights.ts), memoized in pages with `useMemo`.
- **Routing**: [src/App.tsx](src/App.tsx) — `BrowserRouter` with a `basename` (set to `/golf-dashboard-v3/` in production). Routes: `/` (Dashboard), `trends`, `courses`, `import-export`, all nested under `AppLayout`.
- **CSV**: [src/lib/csv.ts](src/lib/csv.ts) handles import parsing/validation and export via Papa Parse. `gir`/`fir` are **percentages (0–100)**, not counts.
- **Types**: All domain types live in [src/types/index.ts](src/types/index.ts) (`Round`, `PlayerProfile`, `GolfCourse`, `Goal`, etc.). `Round.score` must equal `front9 + back9`.

## Layout

```
src/
  context/GolfContext.tsx   # global state + mutators (useGolf)
  lib/                      # storage, stats, insights, csv (pure logic)
  pages/                    # DashboardPage, TrendsPage, CoursesPage, ImportExportPage
  components/               # layout/ (AppLayout, Icons), rounds/ (RoundForm), ui/ (ToastStack)
  data/seed.ts              # seed rounds + profile
  types/index.ts            # domain types
  index.css                 # all styling (single global stylesheet, CSS custom props)
```

## Conventions

- Styling is a single global stylesheet [src/index.css](src/index.css) using CSS custom properties (`--cream`, `--line`, etc.) — no CSS modules or Tailwind. Reuse existing classes/variables; add scoped inline `style` only for one-offs.
- Charts use Recharts; dates use date-fns (`format`, `parseISO`).
- Lint is oxlint with `react/rules-of-hooks` as error — keep hooks unconditional and at the top level.
- Before committing nontrivial UI changes, verify in a real browser (the `webapp-testing` skill drives Playwright against `npm run dev`).

## Deploy

Pushing to `main` triggers [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which runs `npm ci` + `npm run build`, adds an SPA `404.html` fallback + `.nojekyll`, and deploys `dist/` to GitHub Pages. Keep `package-lock.json` in sync or `npm ci` will fail.
