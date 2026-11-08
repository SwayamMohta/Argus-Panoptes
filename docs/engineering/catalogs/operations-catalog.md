# Operations Catalog

> Status: **planned**. No backend, deployment, CI, or monitoring exists yet. Local tooling verified on 2026-11-08.

## 1. Environments

| Environment | Frontend | Backend | Database | Auth/Storage |
|---|---|---|---|---|
| Local development | **Expo Go on a physical Android device (QR)** | uvicorn on `0.0.0.0:8000` | Docker PostGIS on host `:5433` → container `:5432` | Supabase dev project (or env-gated bypass) |
| Standalone testing | **EAS preview APK** | Local or staging | Local or staging | Supabase dev project |
| Preview (API) | — | Vercel preview function | Supabase branch or dev DB | Supabase dev project |
| Production | **Play Store AAB** | Vercel production (HTTPS) | Supabase production | Supabase production |

Android-first is a confirmed constraint. Web is a development convenience, not a deliverable. Full mobile runbook: `docs/engineering/mobile-delivery.md`.

Never point preview deployments at the production database. Use a Supabase branch or a separate project.

## 2. Local setup

### Prerequisites (verified locally)

| Tool | Local version | Required | Notes |
|---|---|---|---|
| Node | 22.19.0 | 22.13+/24.3+/26+ | Compatible with Expo 58 |
| npm | 10.9.3 | — | Compatible |
| Docker | 28.5.1 | Current | Daemon running |
| Python | 3.10.8 | **3.12–3.14** | Upgrade required; Vercel minimum is 3.12 |
| Supabase CLI | not installed | optional | Install for local stack/branching if desired |

### `docker-compose.yml` (planned)

```yaml
services:
  db:
    image: postgis/postgis:17-3.5
    environment:
      POSTGRES_USER: argus
      POSTGRES_PASSWORD: argus
      POSTGRES_DB: argus
    ports:
      - "5433:5432"
    volumes:
      - argus_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U argus -d argus"]
      interval: 5s
      timeout: 5s
      retries: 10
volumes:
  argus_pgdata:
```

### Backend local run (planned)

```bash
# Python 3.13 on this machine: `py -3.13 -m venv backend/.venv`
cd backend
py -3.13 -m venv .venv
./.venv/Scripts/pip install -e ".[dev]"      # Windows
# source .venv/bin/activate && pip install -e ".[dev]"  # macOS/Linux

cd ..
docker compose up -d db

cd backend
./.venv/Scripts/alembic upgrade head
./.venv/Scripts/python -m scripts.seed_reference
./.venv/Scripts/python -m scripts.import_wards
./.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Database URL locally: `postgresql+psycopg://argus:argus@localhost:5433/argus`. Host port **5433** is mapped to container port 5432 because 5432 is already occupied on this machine. Adjust `docker-compose.yml`/`DATABASE_URL` if a different host port is free.

### Android device connectivity (Expo Go)

- Bind uvicorn to `0.0.0.0`, not `127.0.0.1`.
- Put the phone and PC on the same Wi-Fi/LAN.
- Allow inbound TCP 8000 through the host firewall (private network).
- Find the PC LAN IP with `ipconfig` and set:
  `EXPO_PUBLIC_API_URL=http://<LAN-IP>:8000/api/v1` in `frontend/.env.local`.
- Android emulator: `http://10.0.2.2:8000/api/v1`.
- `localhost` on the device does not reach the PC.
- Disable/avoid guest Wi-Fi with client isolation.
- HTTP is allowed only for LOCAL development. Production must use HTTPS.
- CORS is irrelevant for native Android requests but required for Expo web/other browser clients; configure explicit origins.

### Expo Go daily workflow

```bash
cd frontend
npx expo start
# scan the QR code with Expo Go
```

- Use Fast Refresh; do not build APKs/AABs for routine changes.
- Test camera, gallery, API calls, auth, uploads, votes, comments, and map on a physical device.
- Known limit: remote push notifications are not supported in Expo Go on Android; use a development build when push is implemented.

### EAS Build and Submit

- Configure `android.package`, URL scheme, `eas.json`, and EAS project/signing only when a standalone build is actually needed.
- `eas build --platform android --profile preview` → APK for sideloaded testing.
- `eas build --platform android --profile production` → AAB for Play Store.
- `eas submit --platform android --profile production` → upload to Play Console.
- EAS manages the Android keystore; back it up and restrict access. Never commit keystores or Play service-account JSON.
- Complete the Play listing, privacy policy, data safety form, and content rating before production rollout.
- Full details: `docs/engineering/mobile-delivery.md`.

## 3. Supabase setup (once credentials are provided)

1. Create a project in the **Mumbai (`ap-south-1`)** region if available, to reduce latency for Indian users and Vercel `bom1`.
2. Enable PostGIS in the `extensions` schema:
   ```sql
   create extension postgis with schema extensions;
   ```
3. Configure Auth:
   - Enable email OTP; set OTP length to **6**; expiry 1 hour (default).
   - Enable phone OTP only after an SMS provider and DLT registration are ready.
   - Configure asymmetric JWT signing keys (ES256/RS256) and confirm the JWKS endpoint resolves.
   - Add the Expo web origin and production deep-link redirect URLs.
4. Create buckets:
   - `evidence` — private; 12 MB limit; MIME `image/jpeg,image/png,image/webp`.
   - `avatars` — public read or private with signed URLs; 5 MB limit.
5. Apply migrations with a privileged migration role, not the runtime role.
6. Seed reference data idempotently.
7. Verify RLS: direct anon/authenticated Data API access must not mutate application tables.
8. Enable backups/PITR appropriate to the plan.

## 4. Vercel setup

> Canonical production guide: **`../deployment-runbook.md`**. The summary below covers local operations; use the runbook for environment variables, migrations, auth, storage, tile policy, and rollback.

| Setting | Value |
|---|---|
| Project root | **`backend/`** (Vercel project Root Directory) |
| Entrypoint | `backend/pyproject.toml` → `[tool.vercel] entrypoint = "app.main:app"` (no `api/index.py` needed) |
| Python version | `.python-version` = `3.13` |
| Dependency manifest | `backend/pyproject.toml` with `requires-python = ">=3.12,<3.15"` |
| Function duration | `backend/vercel.json` `functions` `maxDuration`: 30 s |
| Region | `sin1` (Singapore), aligned with Supabase `ap-southeast-1` (verified via MCP) |
| Environment variables | Per environment; service-role key only on the server |
| Build step | Dependency install only; do **not** run migrations during build or cold start |

`backend/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sin1"],
  "functions": {
    "app/main.py": { "maxDuration": 30 }
  }
}
```

Vercel entrypoint rules were verified against the official FastAPI deployment guide (last updated 2026-08-27): an `app` instance at `app/main.py` or an entrypoint declared in `pyproject.toml`. `backend/.vercelignore` excludes `.venv`, caches, tests, and local data.

Deployment notes:

- The FastAPI app becomes a single function on Fluid compute.
- Request body limit is 4.5 MB; images must use signed direct uploads.
- Filesystem is read-only except `/tmp` (≤500 MB). Do not write uploads, exports, or temp caches beyond `/tmp`.
- Use Supavisor transaction mode on port **6543** and SQLAlchemy `NullPool` to avoid prepared-statement and connection-exhaustion issues.
- Keep startup light: no heavy model loading, no migration execution, no long external calls.
- Shutdown cleanup is capped at 500 ms; never rely on it for data durability.
- Background work (e.g. orphan cleanup, notice expiry) should use Vercel Cron hitting an authenticated route or a queue, not in-process background tasks.

## 5. Database connections

- Production URL shape: `postgresql+psycopg://<user>.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`.
- Use `poolclass=NullPool` and short transactions.
- Do not use session-level `SET`, temporary tables spanning transactions, `LISTEN/NOTIFY`, or session advisory locks in transaction mode.
- For migrations, use a direct/session connection on port 5432, not the transaction pooler.
- Monitor connection saturation; Supavisor shares backend connections across modes.

## 6. Migrations and rollout

1. Author the migration locally against Docker PostGIS.
2. Test `upgrade head` and `downgrade -1` on a scratch database.
3. Apply to a Supabase branch; run API contract tests.
4. Apply to production during a low-traffic window.
5. Deploy the API that depends on the new schema.
6. Roll back the API via Vercel if needed; migrations are forward-only unless a tested down path exists.

Rules:

- Expands/contracts pattern for destructive changes (add column → backfill → switch reads → drop later).
- Never drop a column or table in the same release that stops writing to it.
- Reference-data seeds use `ON CONFLICT DO UPDATE`.

## 7. Observability

| Signal | Source |
|---|---|
| API logs | Vercel Runtime Logs |
| API latency/errors | Vercel Observability |
| DB logs/health | Supabase Logs + Advisors |
| Storage usage | Supabase Storage dashboard |
| Auth failures/rate limits | Supabase Auth logs |
| Application errors (optional) | Sentry or an equivalent |
| Uptime | External probe on `/health` |

- **Implemented (Phase 8):** `/health` verifies DB connectivity and returns 503 (`database: error`) on failure.
- **Implemented (Phase 8):** `X-Request-ID` on every response (safe values echoed, otherwise generated) and JSON request logs with request id, method, path, status, and duration. Query strings and request bodies are never logged.
- **Implemented (Phase 8):** CORS exposes `X-Request-ID`.
- Do not log JWTs, contact data, precise coordinates, or service-role keys.
- Logging is configured in `app/core/observability.py`; set `LOG_LEVEL` per environment.

## 8. Backups and recovery

- Enable Supabase backups/PITR per plan.
- Storage objects are not covered by database PITR; define a separate backup/export policy for evidence.
- Document restore steps: provision/restore Postgres, point the API at the restored instance, verify Storage object paths.
- Test a restore into a non-production project before launch if feasible.

**Local rehearsal (verified 2026-11-08):**

```bash
docker exec argus-postgis psql -U argus -d argus -c "CREATE DATABASE argus_restore;"
docker exec argus-postgis sh -c "pg_dump -U argus -d argus -Fc -f /tmp/argus.dump"
docker exec argus-postgis sh -c "pg_restore -U argus -d argus_restore --no-owner --exit-on-error /tmp/argus.dump"
docker exec argus-postgis psql -U argus -d argus_restore -tAc "SELECT count(*) FROM areas"       # 155
docker exec argus-postgis psql -U argus -d argus_restore -tAc "SELECT version_num FROM alembic_version"  # 7a696ab4fc5d
docker exec argus-postgis psql -U argus -d argus -c "DROP DATABASE argus_restore WITH (FORCE);"
```

Result: `areas=155`, `categories=8`, `alembic=7a696ab4fc5d`. Supabase branch restore and production PITR remain unverified.

## 9. Rollback

| Failure | Action |
|---|---|
| API defect | Vercel instant rollback to the previous deployment (`vercel rollback`) |
| Bad migration | Apply a corrective forward migration; restore from backup only if data is corrupted |
| Auth misconfiguration | Revert Supabase auth settings; rotate keys with overlap |
| Storage policy error | Revert bucket policy; re-issue signed URLs |

**Migration rollback rehearsal (verified 2026-11-08):** on a scratch `argus_rollback` database, `upgrade head → downgrade 5975bdfe6c06 → upgrade head` returned to `7a696ab4fc5d`. Database downgrades are a last resort; API rollback and forward fixes are preferred. A real Vercel deployment rollback has not been rehearsed (B-5).

## 10. Release checklist

Canonical, evidence-backed checklist: [`../release-checklist.md`](../release-checklist.md). Do not mark deployment or Play Store items complete without target-environment evidence.
