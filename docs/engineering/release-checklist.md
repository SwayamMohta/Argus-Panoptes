# Release Checklist

> Status: **backend hardening and frontend wiring verified by build/local API; deployment and on-device validation are not.** Last updated 2026-11-08. Checked items have command output or inspected evidence. Do not mark a deployment or device item complete without a deployment id / device run.

## 1. Backend quality gates

- [x] `pytest -q` → **112 passed** (2026-11-08)
- [x] `ruff check .` → clean
- [x] `ruff format --check .` → clean
- [x] `alembic check` → no new upgrade operations
- [x] `pip-audit --skip-editable` → **no known vulnerabilities** (pytest upgraded to 9.0.3 for PYSEC-2026-1845)
- [x] Secret scan (regex over the repo): no service-role values, JWT payloads, cloud keys, or production DB credentials. Matches are local `argus:argus` dev URLs and a truncated JWT header example in `documentation.md` only.
- [x] Frontend scan: no `SERVICE_ROLE`, `service_role`, `DATABASE_URL`, JWT secret, or database URL references under `frontend/`.
- [x] Frontend dependencies installed; `npx expo export --platform web` bundles successfully (561 modules).
- [ ] `npm audit` is not clean: 7 moderate `minimatch` advisories in Expo build tooling; accepted as build-time only (TD-B30).
- [x] CI workflow defined (`.github/workflows/ci.yml`): lint, format, migrations, drift, tests, dependency audit, gitleaks. **Not yet executed on GitHub Actions.**

## 2. Database and migrations

- [x] `alembic upgrade head` reproduces `7a696ab4fc5d` on a scratch database.
- [x] Rollback rehearsal on `argus_rollback`: `head → 5975bdfe6c06 → head`, returning to `7a696ab4fc5d`; scratch DB dropped.
- [x] Backup/restore rehearsal: `pg_dump -Fc` of `argus` restored into `argus_restore`; verified `areas=155`, `categories=8`, `alembic=7a696ab4fc5d`; scratch DB dropped.
- [x] Account deletion anonymizes the profile, removes personal artifacts, and retains anonymous civic reports (tested).
- [x] RLS enabled on all 17 application tables; `python -m scripts.check_rls` reports ON for each.
- [x] Retention policy documented in `privacy-retention.md`; `scripts/retention_cleanup.py` dry run verified.
- [ ] Supabase branch migration + restore rehearsal
- [ ] Production backup/PITR enabled and verified

## 3. Observability and resilience

- [x] `GET /health` runs `SELECT 1` and returns 503 with `database: error` on failure (tested).
- [x] Every response carries `X-Request-ID`; unsafe/oversized values are replaced (tested).
- [x] JSON request logs include request id, method, path, status, and duration; query strings are not logged.
- [x] CORS exposes `X-Request-ID`.
- [x] Local perf smoke (`scripts/perf_smoke.py`): all endpoints 200; slowest was ward boundaries at **131.63 ms / 159,346 B**; health 45.34 ms; issues feed 114.54 ms (empty local table).
- [ ] Target-environment latency/error thresholds and alerts
- [ ] Uptime probe against `/health`
- [ ] Sentry or equivalent (optional)

## 4. Deployment (Vercel + Supabase)

Configuration prepared:

- `backend/vercel.json`: functions entry `app/main.py`, `maxDuration=30`, region `sin1`.
- `backend/pyproject.toml`: `[tool.vercel] entrypoint = "app.main:app"`; Python 3.13 in `.python-version`.
- `backend/.vercelignore` excludes the venv, caches, tests, and local data.
- Vercel project **Root Directory must be `backend/`**.
- Supabase project `ndcmhjdssxnhjlovxyaj` region is **ap-southeast-1 (Singapore)**; `sin1` minimizes function-to-DB latency.
- Production DB URL must use Supavisor transaction mode (port **6543**); SQLAlchemy uses `NullPool` + `search_path=public,extensions`.
- Never run migrations on build or cold start.

- [ ] Vercel project created/linked and root directory set to `backend/`
- [ ] Environment variables set per environment (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` server-only, buckets, `CORS_ORIGINS`, `GEOCODER_USER_AGENT` with a real contact)
- [ ] Preview deployment passes the checklist
- [ ] Production deployment passes the checklist
- [ ] `GET /health` returns 200 on the deployment
- [ ] JWKS verification works against the real Supabase project (forged/expired tokens 401)
- [ ] Vercel rollback rehearsed against a real deployment
- [ ] No privileged credentials or cleartext URLs in the app bundle

**Blocked by B-5:** Vercel credentials are not supplied. No deployment has been performed or claimed.

## 5. Mobile / Play Store

- [x] Frontend dependencies installed; Supabase/API client, email/password auth, GPS, image compression, profile/preferences, feed/detail/create, activity/audits/impact/favorites/export/SLA, and area-map issues are wired.
- [x] Demo accounts auto-login removed; app starts as guest and uses email/password signup + login.
- [x] GPS coordinates mandatory at create/confirm; image re-encode strips EXIF and enforces ≤1 MiB.
- [ ] Supabase Auth → Providers → Email → **Confirm email is OFF** (current build uses immediate email/password signup). `python -m scripts.configure_supabase_auth --apply` sets `mailer_autoconfirm` if you have a Management API token
- [ ] Email/password signup and sign-in validated for a brand-new email
- [ ] SMTP is optional for now; configure it before enabling password reset or email confirmation
- [ ] Map tiles: development uses the backend proxy (`/api/v1/tiles/...`, `User-Agent: CivicApp/2.0`, OSM France/HOT fallback, cache). For production, use an approved/commercial provider or self-host; OSM volunteer tiles are not approved for app-scale use
- [ ] After changing tile/auth env values, restart Expo with `npx expo start -c` so `EXPO_PUBLIC_*` values are re-inlined
- [ ] App runs in Expo Go on a physical Android device against the LAN API
- [ ] Admin/official UI (deliberately deferred; APIs only)
- [ ] Map/gazetteer deep-link between Home and Map validated on device
- [ ] EAS Android package/scheme/version configured; preview APK tested
- [ ] Production AAB uploaded to Play internal testing
- [ ] Privacy policy, data safety form, content rating completed

## 6. Known release blockers

| ID | Blocker |
|---|---|
| B-5 | Vercel credentials and remaining Supabase server credentials |
| — | Expo Go device validation not performed in this environment |
| — | No verified Hyderabad asset dataset (assets/inspections deferred) |
| — | Privacy policy / Play data-safety form not written |
| TD-B21 | Nominatim User-Agent contact deferred by owner (development placeholder only) |

`ghmc_wards.kml` is treated as an **open dataset** per the project owner (2026-11-08); retain the original file and include GHMC attribution. Exact licence wording is pending.
