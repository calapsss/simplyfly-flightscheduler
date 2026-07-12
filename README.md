# SimplyFly Flight Scheduler

A crew-scheduling prototype for military flight operations. The app is now a React + FastAPI + SQLite stack designed to run on one VPS.

**Less admin. More flying.**

## Stack

- React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4
- FastAPI + Pydantic, served by Uvicorn
- SQLite via Python's stdlib `sqlite3`
- `vite-plugin-singlefile`, so `npm run build` outputs one self-contained `dist/index.html`

## Quick Start

```bash
npm install
python3 -m pip install -r requirements.txt
npm run dev
```

Local development runs FastAPI at `127.0.0.1:8000` and Vite at `127.0.0.1:5173`. Vite proxies `/api` to FastAPI.

Useful commands:

```bash
npm run dev                         # FastAPI + Vite dev servers
npm run build                       # production React build -> dist/index.html
npm run preview                     # FastAPI serves built React + API
npx tsc --noEmit                    # TypeScript check
python3 -m compileall backend scripts
```

## Data Storage

FastAPI owns persistence. React reads and writes through same-origin `/api/*` endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Backend health check |
| `GET /api/state` | Load full scheduler state |
| `PUT /api/state` | Persist a full scheduler state replacement |
| `POST /api/reset` | Re-seed SQLite from `backend/seed.json` |

Local SQLite defaults to `data/simplyfly.sqlite`. Production should set:

```bash
SIMPLYFLY_DB_PATH=/var/lib/simplyfly/simplyfly.sqlite
```

The backend enables SQLite foreign keys, WAL mode, and a busy timeout. Run one Uvicorn worker for this single-VPS deployment.

## VPS Deployment

1. Install Node.js, Python 3.10+, and a reverse proxy such as Nginx or Caddy.
2. Clone or copy the app to a release directory.
3. Install dependencies and build React:

```bash
npm ci
python3 -m pip install -r requirements.txt
npm run build
```

4. Create the persistent database directory:

```bash
sudo mkdir -p /var/lib/simplyfly
sudo chown simplyfly:simplyfly /var/lib/simplyfly
```

5. Run the app with one Uvicorn process:

```bash
SIMPLYFLY_DB_PATH=/var/lib/simplyfly/simplyfly.sqlite \
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

6. Point Nginx or Caddy at `127.0.0.1:8000` and terminate HTTPS there.

Example `systemd` service:

```ini
[Unit]
Description=SimplyFly Flight Scheduler
After=network.target

[Service]
User=simplyfly
Group=simplyfly
WorkingDirectory=/opt/simplyfly
Environment=SIMPLYFLY_DB_PATH=/var/lib/simplyfly/simplyfly.sqlite
ExecStart=/usr/bin/python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Example Nginx server block:

```nginx
server {
  listen 80;
  server_name schedule.example.com;

  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Backups

Keep `/var/lib/simplyfly` outside deploy wipes. A simple backup can use SQLite's online backup command:

```bash
sqlite3 /var/lib/simplyfly/simplyfly.sqlite ".backup '/var/backups/simplyfly-$(date +%F).sqlite'"
```

## Project Structure

```text
backend/
  main.py          FastAPI app, SQLite schema, seed/reset, static serving
  seed.json        Initial scheduler state
src/
  App.tsx          Root component, API loading/saving, auth state
  store.ts         API persistence helpers + uid()
  types.ts         Domain types + day-label utilities
  components/      Login, flyer dashboard, admin scheduler, shared UI
scripts/
  dev.py           Starts FastAPI and Vite together
```

## Notes

- Tailwind v4 uses CSS-first configuration — edit `@theme` in `src/index.css`, no `tailwind.config.*`
- `@/` path alias maps to `src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- `vite-plugin-singlefile` inlines all assets into the build output
- No test framework or linter is configured; use the checks above before deploying
- The frontend no longer uses `localStorage`; existing browser-local data is not migrated.
- `src/mockData.ts` remains ignored and is not required.
- SQLite is suitable here because the deployment target is one VPS with one app process.
