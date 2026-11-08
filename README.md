# Argus Panoptes — Supabase-backed backend branch

> **Branch:** `with_supabase_backend`
> **Platform:** Android-first Expo + React Native app, FastAPI backend, PostgreSQL/PostGIS, Supabase Auth + Storage.
> **Current scope:** Hyderabad only (155 GHMC wards from `ghmc_wards.kml`).

This branch connects the Expo client to the FastAPI backend. It replaces the
prototype's in-memory data with real APIs, adds Supabase email/password auth and
Storage uploads, and includes a Hyderabad demo dataset. The admin/official UI is
deliberately deferred; the APIs are implemented.

---

## 1. What works

| Area | Status |
|---|---|
| Email/password signup + login (Supabase) | Wired; device test pending |
| Profile, avatar upload, preferences, account deletion | Wired |
| Create report with GPS + compressed evidence upload | Wired |
| Feed, filters/sorts, detail, votes, witness confirmations, threaded comments | Wired |
| Home wards, notices, activity tabs, ward widget, recently resolved | Wired |
| My Audits, Civic Impact, Favorites, Citizen Charter/SLA escalation | Wired |
| Export (JSON/CSV/GeoJSON) | Wired |
| Area map (42% view), ward search/filters, real issues below | Wired |
| Manual ward override + nearest-ward lookup | Wired |
| Admin/moderation UI | Not built (APIs only) |
| OTP login | Deferred; current build uses email/password |
| Password reset / email verification | Deferred (needs SMTP) |
| Hyderabad asset dataset / inspections | Deferred (no verified data) |

Backend: **112 tests**, Ruff clean, Alembic `b4f6a2c81d37`. Frontend: `expo-doctor`
20/20 and production bundles succeed. It has **not** been run on a physical
device in this environment; that is the next validation step.

---

## 2. Architecture

```text
Expo Android app
  │  HTTPS + Supabase JWT
  ▼
FastAPI (backend/) ── SQLAlchemy + PostGIS ── PostgreSQL (Docker locally / Supabase in production)
  │
  ├── Supabase Auth (email/password, JWT verified via JWKS)
  ├── Supabase Storage (evidence private, avatars public)
  └── Tile proxy (OSM → OSM France/HOT, User-Agent CivicApp/2.0, cached)
```

The app bundle contains only public values: Supabase URL, anon/publishable key,
and API URL. The service-role key and database credentials stay server-side.

---

## 3. Repository layout

```text
backend/                 FastAPI app, models, migrations, tests, scripts
  app/api/v1/            Routers (auth/users, issues, media, wards, civic, admin, tiles)
  app/services/          Area resolution, issues, storage, geocoding, tiles, rate limit
  alembic/versions/      Migrations (head b4f6a2c81d37)
  scripts/               Seed/import/perf/RLS/retention/auth-config scripts
  tests/                 pytest suite (112 tests)
frontend/                Expo + React Native app
  src/lib/               Supabase client, API client, media, adapters, tile config
  src/context/           AuthContext, IssuesContext
  src/screens/           Home, Categories, CreateIssue, IssueDetail, GeoMap, Profile, Settings
  src/components/        UI components
docs/engineering/        Catalogs, ADRs, deployment runbook, release checklist, data quality
ghmc_wards.kml           Sole ward dataset (155 GHMC wards)
docker-compose.yml       Local PostGIS for pytest only (host port 5433)
.github/workflows/ci.yml Backend CI + gitleaks
```

> Local-only files are intentionally not committed: `.env`, `.claude/`,
> `.mcp.json`, `CLAUDE.md`, `HANDOVER.md`, `SESSION_*.md`, and the superseded
> `wards_hyderabad.geojson`.

---

## 4. Local setup

### Prerequisites

- Python **3.13** (`py -3.13` on Windows).
- Node **22.13+/24.3+/26+** and npm.
- Expo Go on a physical Android device.
- A Supabase project (Auth, Storage, and **Postgres/PostGIS**).
- Docker Desktop is **optional** and only needed for the pytest database; the
  running backend uses Supabase.

### 4.1 Backend

```bash
cd backend
py -3.13 -m venv .venv
./.venv/Scripts/pip install -e ".[dev]"       # Windows
# source .venv/bin/activate && pip install -e ".[dev]"   # macOS/Linux

cp .env.example .env
```

Fill `backend/.env`:

```bash
# Runtime DB: Supabase Session/Direct connection (port 5432).
# Copy the exact URI from Supabase Dashboard -> Project Settings -> Database.
DATABASE_URL=postgresql+psycopg://postgres:<password>@<host>:5432/postgres

# One-time seed/import URL (same direct/session URI).
SUPABASE_DATABASE_URL=postgresql+psycopg://postgres:<password>@<host>:5432/postgres

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<public anon/publishable key>
```

The schema is already applied to the current Supabase project. For a **fresh**
project, apply it first:

```bash
cd backend
DATABASE_URL="postgresql+psycopg://postgres:<password>@<host>:5432/postgres" \
  ./.venv/Scripts/alembic.exe upgrade head
```

Sync the data (155 wards + reference data + 9 demo reports):

```bash
cd backend
SUPABASE_DATABASE_URL="postgresql+psycopg://postgres:<password>@<host>:5432/postgres" \
  ./.venv/Scripts/python.exe -m scripts.sync_supabase
```

Start the API:

```bash
# Bind to all interfaces so Expo Go on the phone can reach it
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Health check: `http://localhost:8000/health` → 200. The same URL on the PC LAN IP
reaches it from the device.

**Local PostGIS is not required for the backend.** `docker compose up -d db` is
only for `pytest`/offline development (`TEST_DATABASE_URL`).

### 4.2 Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Set:

```bash
EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:8000
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<public anon/publishable key>
# Optional: override the tile provider for production
# EXPO_PUBLIC_TILE_URL=https://tiles.example.com/{z}/{x}/{y}.png
```

Start Metro:

```bash
npx expo start -c
```

Scan the QR in Expo Go on the same Wi-Fi. Allow TCP 8000 through the host
firewall. The phone must use the PC LAN IP, never `localhost`.

### 4.3 Supabase setup

- Enable the **Email** provider.
- Current build uses **email + password**; set **Confirm email OFF** so signup
  returns a session immediately.
- Create buckets `evidence` (private) and `avatars` (public), 1 MiB, JPEG/PNG/WebP.
- The current Supabase project already has the schema and reference data. For a
  fresh project, apply migrations and seed:
  ```bash
  cd backend
  DATABASE_URL="postgresql+psycopg://postgres:<password>@<host>:5432/postgres" \
    ./.venv/Scripts/alembic.exe upgrade head
  SUPABASE_DATABASE_URL="postgresql+psycopg://postgres:<password>@<host>:5432/postgres" \
    ./.venv/Scripts/python.exe -m scripts.sync_supabase
  ./.venv/Scripts/python.exe -m scripts.check_rls
  ```
- SMTP is optional for now; it is needed for password reset/email verification.

Full deployment details: **`docs/engineering/deployment-runbook.md`**.

---

## 5. Demo data

`backend/scripts/seed_demo_data.py` is idempotent and inserts 9 Hyderabad-only
reports across Banjara Hills, Madhapur, Kukatpally, Gachibowli, Tolichowki,
Serilingampally, Jubilee Hills, and Begumpet, with comments, votes,
confirmations, and timelines. Re-running it reports `0 new reports`.

Reference data (8 categories, 32 checkpoints, 5 notices, 6 service standards) and
the 155 GHMC wards are separate idempotent seeds.

---

## 6. Auth mode (current build, temporary)

- Client: `signUp({email,password})` / `signInWithPassword`.
- Supabase: **Confirm email OFF** for immediate login.
- Existing users created via the earlier OTP flow have no password; use a new
  email or configure password reset (SMTP).
- See `docs/engineering/decisions/ADR-011-email-password-temporary.md`.

To set `mailer_autoconfirm` with a Management API token:

```bash
cd backend
SUPABASE_ACCESS_TOKEN=sbp_... ./.venv/Scripts/python.exe -m scripts.configure_supabase_auth --apply
```

---

## 7. Ward assignment

- Default: PostGIS `ST_Covers` against the 155 GHMC polygons, returning
  `matched`, `unmatched`, or `ambiguous`. Never guessed.
- Acceptance envelope: `lat 17.27–17.60`, `lon 78.22–78.65`.
- If the GPS point is outside all polygons, the app shows the nearest ward and
  allows a **manual ward override**. Manual reports are stored with
  `area_assignment_status='manual'`.
- Create Issue has a ward search box and a “Use My Location” resolver.
- See `docs/engineering/decisions/ADR-012-manual-ward-override.md`.

Coordinates are still required and stored privately (`issue_private_locations`);
they are never exposed in public payloads.

---

## 8. Map tiles

- The app requests tiles from the backend proxy:
  `EXPO_PUBLIC_API_URL/api/v1/tiles/{z}/{x}/{y}.png`.
- The proxy sends `User-Agent: CivicApp/2.0`, tries official OSM, falls back to
  OSM France/HOT on block, caches tiles, and returns `Cache-Control`.
- **No map API key is required.**
- This is development/demo use. OSM's volunteer tile policy restricts app-scale
  use; for production use an approved/licensed provider or self-host and set
  `EXPO_PUBLIC_TILE_URL`.
- See `docs/engineering/map-tiles.md`.

---

## 9. Testing

```bash
# pytest uses the local PostGIS test database; Docker is optional for runtime
docker compose up -d db

cd backend
./.venv/Scripts/python.exe -m pytest -q          # 112 passed
./.venv/Scripts/ruff.exe check .
./.venv/Scripts/ruff.exe format --check .
./.venv/Scripts/alembic.exe check
./.venv/Scripts/pip-audit.exe --skip-editable

cd ../frontend
npx expo-doctor                                  # 20/20
npx expo export --platform android               # bundle check
```

Manual device checklist: `docs/engineering/phase9-validation-checklist.md`.
Release gate: `docs/engineering/release-checklist.md`.

CI: `.github/workflows/ci.yml` runs lint, format, migrations, drift, tests,
`pip-audit`, and gitleaks. It has not yet run on GitHub Actions.

---

## 10. Deployment (Vercel + Supabase)

See **`docs/engineering/deployment-runbook.md`** for the full step-by-step.
Summary:

1. Vercel project Root Directory = `backend/`.
2. `backend/vercel.json`: region `sin1`, `app/main.py`, `maxDuration=30`.
3. Set env vars: `DATABASE_URL` (Supavisor **6543**), `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), buckets,
   `SUPABASE_JWT_AUD`, `CORS_ORIGINS`, geocoder/tile user agents.
4. Apply migrations and `scripts/sync_supabase.py` against a **direct/session**
   connection (5432); never during build or cold start.
5. Deploy a preview, run the release checklist, promote to production.
6. For the Android release, set `EXPO_PUBLIC_API_URL=https://<vercel-domain>`
   and build with EAS.

Vercel limitations: 4.5 MB request body (media goes direct to Storage), 30 s
function duration, read-only filesystem, per-instance tile cache. The service-role
key must never be in the app.

---

## 11. Known limitations

- Physical-device Expo Go validation not completed in this environment.
- No admin/official UI; moderation/status APIs exist.
- Password reset and email verification need SMTP.
- OTP login is deferred.
- No verified Hyderabad asset dataset; assets/inspections are deferred.
- OSM tile proxy is development-only per OSM policy.
- Public coordinate masking (home anchor) is not implemented.
- `npm audit` reports 7 moderate `minimatch` advisories in Expo build tooling
  (not shipped app code).
- Nominatim production contact and exact KML licence wording are pending.

---

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| `EXPO_PUBLIC_API_URL` warning / API unreachable | Use the PC LAN IP, bind uvicorn to `0.0.0.0`, allow TCP 8000, same Wi-Fi |
| 401 from the API | Check Supabase URL/JWKS; sign in again |
| `Request failed (422)` | The banner now shows the field/message; common cause is coordinates outside Hyderabad without a manual ward |
| Map shows “Access denied” / old OSM tile | Restart Metro with `npx expo start -c`, clear Expo Go cache, confirm the tile proxy URL in the Metro log |
| Map blank | Check `http://<LAN-IP>:8000/api/v1/tiles/13/5880/3689.png`; check `X-Tile-Provider` |
| Auth email not sent | SMTP not configured; current signup does not need email if Confirm email is OFF |
| Migrations fail | Use the correct `DATABASE_URL`/port; local DB is on 5433, container 5432 |
| Expo Go cannot open the project | Update Expo Go, use Node 22.13+, restart Metro with `-c` |
| Android device can’t reach the API | Firewall, LAN IP, no guest Wi-Fi/client isolation |

---

## 13. Documentation

Start at **`docs/engineering/README.md`**. Key documents:

- `docs/engineering/deployment-runbook.md` — Vercel + Supabase production steps.
- `docs/engineering/phase9-validation-checklist.md` — device test checklist.
- `docs/engineering/release-checklist.md` — evidence-backed release gate.
- `docs/engineering/catalogs/` — API, data, security, operations, quality.
- `docs/engineering/decisions/` — ADRs (auth mode, manual ward override, KML, etc.).
- `docs/engineering/privacy-retention.md` — data inventory, retention, deletion.
- `docs/engineering/map-tiles.md` — tile proxy, attribution, OSM policy.
- `docs/engineering/technical-debt.md` and `risk-register.md` — limitations.

`TRACKER.md` holds the current state. `HANDOVER.md`, `CLAUDE.md`, `.claude/`,
and `.mcp.json` are local-only and intentionally not committed.

---

## 14. Contributing

1. Branch from `with_supabase_backend`.
2. Do not commit `.env`, keys, service-role credentials, or generated caches.
3. Run backend tests/lint and `npx expo-doctor` before pushing.
4. Update `TRACKER.md` and the relevant catalog when behavior changes.
5. Use clear, conventional commit messages.

## Licence and attribution

- `ghmc_wards.kml` is treated as an **open dataset** per the project owner
  (2026-11-08); retain the original and include GHMC attribution. Exact licence
  wording is pending.
- Map data: `© OpenStreetMap contributors`.
- Do not label the KML as ODbL/OSM unless the owner supplies that wording.
