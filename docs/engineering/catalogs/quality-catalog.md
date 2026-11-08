# Quality Catalog

> Status: **backend checks, CI workflow, and frontend production bundles are configured; GitHub Actions and on-device tests have not run.** Evidence: `pytest -q` → 112 passed; `ruff check` and `ruff format --check` clean; `alembic check` reports no drift; `pip-audit --skip-editable` reports no known vulnerabilities; Expo web/Android bundles succeed (2026-11-09).

## 1. Current state

| Area | Status | Evidence |
|---|---|---|
| Frontend tests | Not configured | No unit tests; `npx expo export --platform web` is used as a build/import check |
| Frontend bundle | Verified | Web (562 modules) and Android (936 modules) bundles succeed; **not run on a device** |
| Tile proxy | Verified | `GET /api/v1/tiles/13/5880/3689.png` → 200, 26,235-byte PNG, `X-Tile-Provider: osm`, `Cache-Control`; fallback/UA/502 tests pass |
| Device validation | Not performed | Expo Go on a physical Android device is required before release |
| Frontend lint/format | Not configured | No ESLint/Biome/Prettier config |
| Frontend type checks | Not applicable | Plain JavaScript, no TypeScript |
| Backend tests | Configured and passing | 112 tests: reference, areas/wards, auth, profiles, preferences, issues, votes, confirmations, comments, media, geocoding, activity/audits/impact, favorites, export, SLA escalation, role gates, status/resolution, moderation, audit log, notices, rate limiting, health/request ids, account deletion, ward open-issue counts |
| Backend lint/types | Ruff passing | `ruff check` + `ruff format --check` clean; no mypy gate |
| Migration drift | Verified clean | `alembic check` → no new upgrade operations |
| CI/CD | Configured, not executed | `.github/workflows/ci.yml`: PostGIS service, lint, format, migrate, drift, tests, pip-audit, gitleaks |
| Security scanning | Dependency audit passing; secret scan configured | `pip-audit --skip-editable` → no known vulnerabilities; local regex scan clean; gitleaks runs in CI |
| Performance smoke | Verified locally | `python -m scripts.perf_smoke`: all 200; slowest ward boundaries 131.63 ms / 159,346 B |
| Deployment validation | Not performed | No deployment |
| Expo Go device test | Not performed | No backend or integration yet |
| EAS Build / Submit | Not configured | No `eas.json`, signing, or Play Console app |

The four `@testing-library/*` packages present only in `package-lock.json` are unused.

## 2. Proposed backend test strategy

### Unit

- `services/ranking.py`: trending formula and tie-breaking.
- `services/privacy.py`: masking radius selection, public projection excludes author/exact coords.
- `services/refs.py`: report reference format and collision retry.
- `services/civic.py`: GeoJSON structure, CSV headers/rows, JSON shape, activity scoping, impact de-duplication. **Implemented in Phase 6 (`tests/test_civic.py`).**

### Integration (real PostGIS)

Use a `postgis/postgis:17-3.5` service in CI or `testcontainers`.

- Alembic `upgrade head` on a clean database.
- Reference seed is idempotent (run twice, same counts).
- Create issue → vote → confirm → comment → read feed → detail timeline.
- Vote toggle/switch arithmetic and non-negative floor.
- Confirmation toggle and unique constraint.
- Comment depth enforcement (reply to depth 3 returns 422).
- Feed filters/sorting/pagination.
- Preference updates and profile reads.
- Favorite CRUD.
- Export formats and ownership isolation.
- Soft delete behavior.

### Authorization and security

- No token → 401; expired/forged/wrong-audience token → 401.
- Citizen → official/admin endpoint → 403.
- Anonymous issue payload has no author/exact coordinates.
- User A cannot edit/delete user B's issue/comment/favorite.
- Upload URL path is scoped to the caller; MIME/size validation rejects bad input.
- Duplicate vote/confirm requests are idempotent.
- RLS: direct Data API access cannot write application tables.

### Contract

- Response keys match the frontend's expected camelCase shape.
- Timeline has four keys and the expected labels.
- `upvotes` is never negative.
- Dates are ISO-8601 UTC.

### Performance smoke

- Seed ~10k issues; feed query with trending sort uses the intended index and returns in an acceptable time.
- Spatial `near`/`bbox` query uses GiST.
- `/health` responds quickly with DB up/down.

## 3. Proposed frontend verification

Because the client is plain JavaScript with no tests:

- Add a minimal API-client contract test once the client is wired (Jest or Vitest + MSW).
- Add a smoke test for auth/session restoration and the 6-digit OTP screen.
- Manually verify camera (protected), create issue with photo, feed, detail, vote, comment, locality, map, profile edit, settings persistence, and export.
- Verify the app on a physical **Android** device through Expo Go. Web is optional for development; iOS is a later target.
- Use the existing design rules (`AGENTS.md`, `.agents/rules/ui-design-rules.md`) as a review checklist.

## 3.1 Android device and release validation (required)

Routine development:

- [ ] App loads in **Expo Go** on a physical Android device via QR.
- [ ] Device reaches the local FastAPI backend through the PC LAN IP (`EXPO_PUBLIC_API_URL`).
- [ ] Camera permission/capture, gallery picker, location permission, secure session, and uploads work.
- [ ] Feed, vote, confirm, comment, locality, notice, map, profile, and settings flows work against the API.
- [ ] Session survives app restart.
- [ ] No privileged credentials in the bundle.

Standalone/release:

- [ ] EAS **preview APK** installs and runs on a physical device.
- [ ] EAS **production AAB** installs from Play internal testing.
- [ ] Production API uses HTTPS; no cleartext traffic.
- [ ] Secret scan passes; no service-role/DB credentials.
- [ ] Play listing, privacy policy, data safety, and content rating complete.
- [ ] Rollback path (previous Play release + Vercel deployment) documented.

These are **not executed** yet. Do not mark them passed without device/build evidence.

## 4. Proposed CI pipeline

```text
1. Backend
   - ruff check + ruff format --check
   - mypy (optional, non-blocking initially)
   - pytest with PostGIS service
   - alembic upgrade head on a clean DB + seed twice
   - pip-audit / dependency scan
   - secret scan
2. Frontend
   - npm ci
   - npm run lint (after adding config)
   - API contract tests (after adding)
3. Deploy
   - Preview deployment on PR
   - Production on merge to main after gates
```

## 5. Definition of done for backend tasks

- Endpoint/schema implemented and documented in the interface/data catalogs.
- Unit/integration tests added and passing locally and in CI.
- Authorization cases covered.
- Migration applied to a clean DB and a Supabase branch.
- No secrets, no debug logging of PII/coordinates.
- `TRACKER.md` and affected catalogs updated.
- Frontend contract verified (field names/shapes).

## 6. Evidence rule

Do not write "tests pass," "build passes," or "deployed" without the command output or deployment id. Until then, status is `not configured` or `not validated`.
