# SimplyFly Flight Scheduler

A crew-scheduling prototype for military flight operations. Built with React 19, TypeScript 5.9, Vite 7, and Tailwind CSS 4.

**Less admin. More flying.**

## Features

- **Role-based views** — Flyer dashboard for personal schedule and availability; admin dashboard for full operational control
- **Auth-free login** — Email lookup against a seed roster (no password). Quick-access button for demo
- **Admin daily scheduler** — Drag-and-drop flyer cards onto an aircraft×block-time grid (native HTML5 DragEvent, no library)
- **Inline editing** — Click to edit block times, aircraft types, mission designators, and area assignments. Enter/blur saves, Escape cancels
- **SOP violation warnings** — Visual feedback for crew conflicts (red), 3+ consecutive flights (amber), and 4+ flights in a day (rose)
- **LocalStorage persistence** — All state survives page refresh. Reset button restores seed data
- **Self-contained build** — `vite build` outputs a single `dist/index.html` with all JS/CSS inlined

## Quick start

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build → dist/index.html
npm run preview    # preview the production build
npx tsc --noEmit   # typecheck
```

## Data model

| Type | Description |
|------|-------------|
| `User` | Flyer or admin with name, rank, callsign, email |
| `Block` | Operating window with start/end time for a specific day |
| `Aircraft` | Tail number, type, and per-block availability |
| `Availability` | Flyer-declared time ranges they're available |
| `Assignment` | A scheduled sortie: PIC + CP → aircraft at a block, with mission and area assignment |

State is held as plain React state at the `App` level and persisted to `localStorage` under key `simplyfly:v1`.

## Project structure

```
src/
  main.tsx              Entrypoint
  App.tsx               Root component, state holder
  types.ts              All domain types + day-label utilities
  store.ts              Seed data + localStorage persistence
  index.css             Tailwind v4 @theme + custom utilities
  components/
    Login.tsx           Email-based login screen
    AppShell.tsx        Shared layout wrapper
    FlyerDashboard.tsx  Flyer home: upcoming schedule + availability
    AdminDashboard.tsx  Admin tabs: scheduler, blocks, aircraft, overview, flyers
    ui.tsx              Shared UI primitives: Card, Button, Input, Pill, etc.
  utils/
    cn.ts               cn() helper wrapping clsx + tailwind-merge
```

## Stack notes

- Tailwind v4 uses CSS-first configuration — edit `@theme` in `src/index.css`, no `tailwind.config.*`
- `@/` path alias maps to `src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- `vite-plugin-singlefile` inlines all assets into the build output
- No test framework or linter configured; no CI pipeline

## Seed data

The prototype ships with a Philippine Air Force training squadron roster:
- **3 aircraft** (tail numbers 064, 945, 009) with 6 operating periods per day (04:59–19:29)
- **26 flyers** with ranks and 13 pre-assigned sorties across all three aircraft
- Aircraft 009 is restricted to 1 sortie (HPO), reflected in block availability
- Block times, aircraft types, missions, and area assignments are all editable in the admin UI

## Way ahead

| Priority | Feature | Description |
|----------|---------|-------------|
| 1 | **Full pilot profile** | Dedicated profile view per flyer — show rank, track, quals, flight history, and availability at a glance |
| 2 | **Pilot qualifications** | Track and manage pilot qualifications (e.g., instrument, formation, night, NVG) with expiry dates; filter/restrict assignments by qual |
| 3 | **Flight hour tracking** | Log and roll up flight hours per pilot — daily, monthly, and cumulative; enforce flight/duty-period limits |
| 4 | **Shareable export** | Export the daily schedule as a PNG/image for messaging apps (WhatsApp, Telegram, etc.) — one tap to share



## TODO
1. Need a sample mock data
2.  Transition to Real Database
3. Prototype with Supabase and Vercel
4. Functional And Working
5. Upload roster
6. Autosync
7. Need Agent file for creation.

