# Deployment Runbook — Vercel + Supabase

> Canonical production deployment guide. Local setup is in the root `README.md`.
> Current migration head: **`b4f6a2c81d37`**.

## 1. Architecture

```text
Expo Android app (Expo Go / EAS build)
   │  HTTPS + Supabase JWT
   ▼
FastAPI on Vercel (backend/, region sin1)
   │  SQLAlchemy + NullPool, Supavisor transaction pooler
   ▼
Supabase Postgres + PostGIS (ap-southeast-1)
   │
   ├── Supabase Auth (email/password; JWT via JWKS)
   ├── Supabase Storage (evidence private, avatars public)
   └── Backend tile proxy → OSM / OSM France / HOT
```

- Vercel serves only the API; the Expo app is distributed separately (Play Store).
- Supabase owns Auth, Postgres/PostGIS, and Storage.
- The app contains only public configuration: Supabase URL, anon/publishable key, API URL.
- The service-role key and database credentials are **server-only**.

## 2. Prerequisites

- Vercel account and a project connected to this repository.
- Supabase project (current reference: `ndcmhjdssxnhjlovxyaj`, region `ap-southeast-1`).
- Python 3.13 locally (`.python-version` is in `backend/`).
- Database migrations applied first (see §4).
- For the mobile release: EAS CLI, Google Play Console access.

## 3. Supabase setup

### Auth

- Email provider enabled.
- **Current build:** email + password (`signUp` / `signInWithPassword`), with **Confirm email OFF** so signup returns a session immediately. See `docs/engineering/decisions/ADR-011-email-password-temporary.md`.
- SMTP is optional for signup/login; it is required before enabling password reset or email confirmation. If you later switch to OTP, the Magic Link template must include `{{ .Token }}` (see the Supabase Auth guide).
- JWKS endpoint: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`.
- The backend requires `SUPABASE_URL`; issuer and JWKS URL are derived.

### Storage

Create these buckets (already configured for the current project):

| Bucket | Visibility | Limit | MIME |
|---|---|---|---|
| `evidence` | Private | 1,048,576 bytes | JPEG, PNG, WebP |
| `avatars` | Public read | 1,048,576 bytes | JPEG, PNG, WebP |

Policies: authenticated insert only into `auth.uid()/…`; authenticated select for signed reads; no client update/delete.

### Database

- Use PostGIS in the `extensions` schema.
- The **direct** `db.<ref>.supabase.co` host may be IPv6-only and can fail DNS on
  IPv4 networks. Use the **Session pooler** (`aws-0-<region>.pooler.supabase.com:5432`,
  user `postgres.<ref>`) for the local backend and seeding. Use the Transaction
  pooler (`:6543`) only for Vercel runtime.
- Run the Alembic migrations with a **direct/session connection (port 5432)**, not the transaction pooler.
- Verify RLS after migrations:
  ```bash
  cd backend
  python -m scripts.check_rls
  ```
- Do not seed assets; the Hyderabad asset dataset is not verified.

## 4. Migrations and data sync

**Current project status (2026-11-09):** the schema (`b4f6a2c81d37`), reference
data (8 categories, 32 checkpoints, 5 notices, 6 service standards), **155
wards**, **9 demo reports**, **12 comments**, and 2 demo profiles are already in
Supabase. The backend runs against the Session pooler; local Postgres is only
used by pytest.

Run migrations from a trusted machine or CI, not from the Vercel build:

```bash
cd backend
export DATABASE_URL="postgresql+psycopg://postgres.<project-ref>:<password>@<direct-host>:5432/postgres"
./.venv/Scripts/alembic.exe upgrade head      # Windows
# source .venv/bin/activate && alembic upgrade head   # macOS/Linux
./.venv/Scripts/alembic.exe current
./.venv/Scripts/alembic.exe check
```

Expected head: `b4f6a2c81d37`.

Seed/refresh the reference data, 155 GHMC wards, and the Hyderabad demo reports
with a direct/session connection:

```bash
cd backend
./.venv/Scripts/python.exe -m scripts.sync_supabase
```

The script reads `SUPABASE_DATABASE_URL` from the environment/`.env`; if it is
empty it reuses `DATABASE_URL`.

The script is idempotent and prints table counts. It refuses to run unless the
schema is at `b4f6a2c81d37`.

Never run migrations automatically on Vercel build or cold start. For destructive
changes, use expand/contract and test on a Supabase branch first.

## 5. Vercel project

1. Import the repository.
2. Set **Root Directory** to `backend/`.
3. Framework preset: Vercel detects FastAPI from `pyproject.toml`
   (`[tool.vercel] entrypoint = "app.main:app"`).
4. Keep `backend/vercel.json`:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "regions": ["sin1"],
     "functions": { "app/main.py": { "maxDuration": 30 } }
   }
   ```
   `sin1` is aligned with the Supabase `ap-southeast-1` region.
5. `.python-version` is `3.13`.
6. `backend/.vercelignore` excludes the venv, caches, tests, and local data.

## 6. Environment variables (Vercel)

Set these for **Preview** and **Production**. Never put privileged values in the
Expo app.

| Variable | Example / notes |
|---|---|
| `ENVIRONMENT` | `production` |
| `LOG_LEVEL` | `INFO` |
| `DATABASE_URL` | Supavisor **transaction** URL, port **6543** on Vercel; **Session pooler** port **5432** locally |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | public anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only**; optional if storage signing uses the caller token |
| `SUPABASE_JWT_AUD` | `authenticated` |
| `EVIDENCE_BUCKET` | `evidence` |
| `AVATAR_BUCKET` | `avatars` |
| `MAX_IMAGE_BYTES` | `1048576` |
| `SIGNED_URL_TTL_SECONDS` | `3600` |
| `CORS_ORIGINS` | comma-separated web origins (native apps do not need CORS) |
| `GEOCODER_URL` | `https://nominatim.openstreetmap.org` |
| `GEOCODER_USER_AGENT` | `ArgusPanoptes/0.1 (contact@your-domain)` before production |
| `TILE_USER_AGENT` | `CivicApp/2.0` (add a contact before production) |
| `TILE_CACHE_SECONDS` | `86400` |

- Do **not** set `TEST_DATABASE_URL` in production.
- Database URL shape:
  `postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
- `NullPool` is already configured. Use short transactions and avoid session-level
  `SET`, temporary tables across transactions, `LISTEN/NOTIFY`, or session advisory locks.

## 7. Deploy

1. Push the branch (`with_supabase_backend`) to GitHub.
2. Create a Vercel preview deployment.
3. Verify:
   - `GET /health` → 200
   - `GET /api/v1/categories`, `/notices`, `/wards/boundaries` → 200
   - Supabase signup/signin → session; `GET /api/v1/users/me` → 200
   - Storage upload URL + direct PUT + attach → 200
   - `GET /api/v1/tiles/13/5880/3689.png` → image/png with `X-Tile-Provider`
   - Forged/expired tokens → 401; citizen → admin route → 403
4. Promote the preview to production.
5. Run `docs/engineering/release-checklist.md` against the production URL.

## 8. Vercel-specific constraints

- **4.5 MB request body limit:** images must go directly to Supabase Storage via signed URLs; never proxy file bytes through Vercel.
- **Function duration:** `maxDuration` is 30 s. The tile proxy adds a network hop; keep tile requests cached and consider a CDN/provider for production.
- **In-process tile cache:** the LRU is per function instance and is not shared. For production, use a CDN/shared cache or an approved tile provider/self-hosted server. OSM's volunteer tile policy restricts app-scale use; a User-Agent does not grant permission.
- **Filesystem:** read-only except `/tmp`; never persist uploads or cached tiles to disk on Vercel.
- **Cold starts:** keep startup light; do not run migrations or heavy work on import.
- **CORS:** set `CORS_ORIGINS` for any web client; native requests are not CORS-gated.
- **Secrets:** service-role key and database credentials are server-only; the app bundle may contain only the Supabase URL, anon key, and API URL.

## 9. Rollback

| Failure | Action |
|---|---|
| API defect | `vercel rollback` to the previous deployment |
| Bad migration | Apply a corrective forward migration; restore from backup only if data is corrupted |
| Auth misconfiguration | Revert Supabase settings; rotate keys with overlap |
| Storage policy error | Revert the bucket policy; re-issue signed URLs |

- Enable Supabase backups/PITR before production.
- Rehearse a restore into a non-production project.
- A database downgrade is a last resort; test it on a Supabase branch first.

## 10. Mobile release

- Set `EXPO_PUBLIC_API_URL=https://<vercel-domain>` for production builds.
- Use HTTPS; no cleartext traffic in release builds.
- Build with EAS:
  - preview APK for standalone testing;
  - production AAB for Play Store.
- Submit with EAS Submit; complete the Play listing, privacy policy, data-safety form, and content rating.
- See `docs/engineering/mobile-delivery.md`.

## 11. Post-deploy monitoring

- `/health` uptime probe.
- Vercel Runtime Logs (JSON logs include `requestId`, method, path, status, duration; no query strings).
- Supabase logs/advisors for DB/Auth/Storage errors.
- Review `admin_audit_log` for privileged actions.
- Run `python -m scripts.retention_cleanup --apply` on a schedule (or an equivalent cron).
