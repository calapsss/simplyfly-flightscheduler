# SimplyFly Flight Scheduler — Agent Guide

## Stack
- React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4
- `@tailwindcss/vite` plugin — Tailwind configured via `@theme` in `src/index.css` (no `tailwind.config.*`)
- `vite-plugin-singlefile` — `vite build` outputs a single `dist/index.html` (all JS/CSS inlined)

## Commands
| Action | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` (outputs self-contained `dist/index.html`) |
| Preview | `npm run preview` |
| Typecheck | `npx tsc --noEmit` |

No test framework or lint runner is configured. No CI.

## Path aliases
`@/` → `src/` (configured in both `tsconfig.json` and `vite.config.ts`).

## Architecture
- **Entrypoint**: `src/main.tsx` → `src/App.tsx`
- **State**: Plain React state persisted to `localStorage` key `simplyfly:v1` via `src/store.ts`. Not Zustand/Redux. The `App` component holds the single `AppState` and passes it down with `onChange` callbacks.
- **Types**: `src/types.ts` — `User`, `Block`, `Aircraft`, `Availability`, `Assignment`, `AppState`. `Assignment` has optional fields `mission` and `areaAssignment`. Also exports `rangesOverlap()` and day label arrays.
- **Auth**: Email lookup against the seed users list. No real auth, no password check. A "quick access" button skips the form.
- **Admin scheduling**: Drag-and-drop flyer cards onto a grid of aircraft×blocks (native HTML5 DragEvent, no library).
- **Styling**: Custom `cn()` utility wrapping `clsx` + `tailwind-merge` in `src/utils/cn.ts`. Custom `navy` and `sky` color palettes defined in `index.css`.
- **ID generation**: `uid(prefix)` in `src/store.ts` generates random IDs (`prefix-random`). Used by Block, Aircraft, etc.

## Key directories
```
src/
  components/   AppShell, Login, FlyerDashboard, AdminDashboard, Logo, ui (shared)
  utils/cn.ts   class merge helper
  types.ts      all domain types
  store.ts      seed data, localStorage persistence
  index.css     Tailwind v4 @import + @theme + custom utilities
```

## Notable details
- Tailwind v4 uses CSS-first config. To customize theme values, edit the `@theme` block in `src/index.css`.
- Seed blocks are generated for the *current weekday* (`new Date().getDay()`) at runtime.
- Admin tab order: Daily scheduler > Block times > Aircraft > Overview > Flyers.
- The prototype uses `simplyfly:aero` email domain for all users.
- Block times tab supports inline editing (click time to edit start/end). When adding a block, end auto-fills to start + 1h30m until the end field is manually touched.
- Scheduler cell inline-editing: Enter/blur saves, Escape cancels.

## Conventions
- Import path alias `@/` for `src/` imports.
- Use `cn()` from `@/utils/cn` for conditional className merging.
- State types in `types.ts`, seed data and persistence in `store.ts`.
