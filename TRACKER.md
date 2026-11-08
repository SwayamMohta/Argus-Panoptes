# Argus Panoptes — Project Tracker

> Current-state tracker. Replace stale information; do not append history.
> Last reconciled: 2026-11-09

## 1. Current objective

Deliver the working Hyderabad civic app end-to-end: backend phases 0–8 and the Phase 9 frontend cut-over are implemented. The remaining work is on-device Expo Go validation against the local FastAPI/PostgreSQL stack, then deployment/Play Store readiness.

## 2. Active task

Phase 9 frontend cut-over is implemented: Supabase email/password signup + login, persistent sessions, authenticated API client, GPS-gated create/confirm, compressed direct evidence uploads, API-backed feed/detail/comments/votes, profile/preferences, activity/audits/impact/favorites/export/SLA, and a ward-driven map where selecting an area opens its reported issues. Manual ward selection (search + GPS resolver), nearest-ward lookup, and a backend OSM tile proxy (CivicApp/2.0 UA, OSM France/HOT fallback, cache) are in place. Hyderabad-only demo data (9 reports, comments, votes, confirmations) is seeded. Compliance includes account deletion, RLS on all tables, a documented retention policy, and EXIF-stripping uploads. Backend: **112 tests pass**, Ruff/Alembic clean, `pip-audit` clean. Bundles succeed. **On-device Expo Go validation and deployment are still pending** (deployment blocked on B-5). The `with_supabase_backend` branch README and deployment runbook are the handoff docs.

## 3. Overall status

| Area | Status | Evidence |
|---|---|---|
| Frontend inspection | done | Full source read + 5 parallel inspection passes |
| Dependency/version verification | done | `frontend/package-lock.json`, Expo 58.0.23 installed, `npx expo-doctor` 20/20 |
| Backend architecture plan | review | `docs/engineering/architecture/backend-architecture.md` |
| Database design | review | `docs/engineering/catalogs/data-catalog.md` |
| API inventory | review | `docs/engineering/catalogs/interface-catalog.md` |
| Security strategy | review | `docs/engineering/catalogs/security-catalog.md` |
| Tracking skill | done | `.claude/skills/tracking/SKILL.md` |
| Hyderabad ward dataset | done | `ghmc_wards.kml`: 155 GHMC wards, 0 invalid, 0 duplicate/empty names, 25 boundary-sliver pairs |
| Backend implementation | phase 0–8 done | Scaffold, migrations, seeds, ward import, auth, profiles, preferences, issues, engagement, media, wards/notices, civic tools, admin/moderation, observability, CI, release rehearsal |
| Frontend cut-over | wired; device test pending | Supabase auth/session, API client, GPS, media, all citizen surfaces, area-driven map, Hyderabad seed data |
| Compliance | done (backend) | Account deletion, RLS on 17 tables, retention policy/cleanup, EXIF stripping |
| Deployment | blocked on credentials | Vercel config prepared; no deployment (B-5) |
| On-device validation | todo | Expo Go against the LAN API |
| Hyderabad assets | blocked on data | No verified Hyderabad asset dataset; the map is API-driven wards + real issues, no fabricated assets |
| Supabase project | configured | `ndcmhjdssxnhjlovxyaj`: `evidence` (private) + `avatars` (public) buckets, 1 MiB cap, scoped policies |
| Runtime database | **Supabase** | Schema `b4f6a2c81d37` + reference data applied; 155 wards/demo sync pending the DB password. Local Docker is pytest-only |

### Platform and delivery constraints (confirmed 2026-11-08)

- Android-first native app; not a web app/PWA. Web is dev-only.
- Primary distribution: Google Play Store via EAS Build (AAB) + EAS Submit.
- Daily development: Expo Go + QR against the local FastAPI/PostgreSQL stack over LAN.
- APKs/AABs only for standalone testing/releases, not routine iteration.
- Development build only when an Expo Go-incompatible native module is required.
- Backend stays platform-agnostic so iOS can be added later.
- Production: HTTPS only; no privileged credentials in the app bundle.
- Full runbook: `docs/engineering/mobile-delivery.md`.

## 4. Completed work

- Indexed all 11 screens, 24 components, 2 contexts, 8 constant modules, and app shell.
- Verified the app is Expo SDK 58 / React Native 0.88.1 / React 19.3.0, Node 22.13+.
- Confirmed zero API calls, zero persistence, zero GPS, zero file upload, zero auth backend.
- Confirmed data volume: 8 categories (32 checkpoints), 9 localities, 5 notices, 18 mock issues, 7 map wards / 16 map assets, 2 demo accounts.
- Verified Vercel FastAPI support (Python 3.12–3.14), Supabase PostGIS, JWKS auth verification, Supabase Storage signed uploads, and Supavisor transaction pooling.
- Produced the frontend index, mapping, schema, endpoint inventory, security plan, roadmap, debt and risk registers.
- Created the project-local tracking skill.
- Captured Android-first mobile delivery, Expo Go, EAS Build/Submit, LAN testing, HTTPS, and credential-boundary constraints in `CLAUDE.md`, `AGENTS.md`, and `docs/engineering/mobile-delivery.md`.
- Imported the 145-ward OSM GeoJSON in Phase 1.5 (historical; superseded in Phase 5 by `ghmc_wards.kml`, ADR-010). No OSM metadata was stored in application tables.
- Accepted Hyderabad-only geography and the area assignment/no-guess rules (ADR-008); superseded the TGRAC attempt (ADR-006). The sole-source decision moved from ADR-009 (GeoJSON) to ADR-010 (GHMC KML).
- Implemented the backend scaffold: FastAPI app, settings, SQLAlchemy session, Alembic migration, idempotent reference seeds, health/reference/area endpoints.
- Added and passed 10 pytest tests covering health, categories/checkpoints, notices, service standards, area matched/boundary/multipolygon/unmatched/ambiguous/search.
- Smoke-tested the live API: Kukatpally and Banjara Hills resolve to their wards; outside-Hyderabad coordinates return `unmatched`; notices/SLAs/categories return expected counts.
- Phase 2: implemented JWKS JWT verification (`PyJWKClient`, ES256/RS256, `exp`/`sub`/`aud`/`iss` required), 401 on missing/malformed/forged/expired/wrong-audience/wrong-issuer tokens, lazy `profiles` + `user_preferences` creation, profile read/update, preferences read/update.
- Added Alembic migration `207be3890891` for `profiles` and `user_preferences`. `profiles.id` is the Supabase `sub`; no local FK to `auth.users` (that table exists only in Supabase).
- Added 16 pytest tests for auth, profile, and preferences behavior. B-2 resolved as **email OTP only** for the initial release.
- Phase 3: implemented `issues`, `issue_private_locations`, `issue_events`, `issue_votes`, `issue_confirmations`, `comments`, and `comment_votes` with migration `d25fc97bcb78`.
- `POST /issues` requires exact coordinates, rejects points outside the Hyderabad bbox, derives `area_id` via `ST_Covers` (`matched`/`unmatched`/`ambiguous`, never a guess), stores the exact point only in the private table, seeds the author vote and `reported` event, and returns a 4-step timeline.
- `GET /issues` supports category/status/area/assignment/author/text/urgent/bbox/proximity filters, `trending`/`new`/`top`/`resolved` sorts, pagination, and optional per-caller vote/confirm personalization.
- Vote and confirmation toggles use row locks; confirmations require coordinates and reject witnesses >2 km away. Comments enforce depth ≤3, server-set `is_official`, and nested threaded responses.
- Anonymous issues/comments hide the author in every public payload; exact coordinates are never serialized (B-4/ADR-007 resolved as server-side pseudonymity).
- Added 21 pytest tests for issue creation, area derivation, filters, sorting, pagination, privacy projection, votes, confirmations, comment depth/threading, and comment votes.
- Phase 4: implemented `POST /media/upload-url` (signed Supabase upload URL, caller-scoped path), `POST /issues/{id}/image` (author-only attach with ownership/existence/size/type validation), `GET /issues/{id}/image-url` (short-lived signed evidence URL), and `POST /users/me/avatar`.
- Removed unvalidated `imagePath`/`imageCaption` from issue creation; evidence is only attached through the validated endpoint.
- Configured Supabase project `ndcmhjdssxnhjlovxyaj`: private `evidence` and public `avatars` buckets with `file_size_limit=1048576` and JPEG/PNG/WebP allowlists; authenticated insert limited to the caller's `auth.uid()` folder; authenticated select for signed reads.
- Added 14 pytest tests for upload limits, MIME rejection, path scoping, author-only attachment, object validation, avatar attach, and signed URL generation.
- Phase 5: added `GET /wards?q=&zone=` (id, name, zone, circle, centroid), `GET /wards/{id}` (ward polygon as GeoJSON), and `GET /wards/boundaries` backed by the 155-ward GHMC KML. Live-verified Kukatpally returns a Polygon.
- Added notice filters: `category`, `q` across title/summary/locality text, and existing `includeExpired`/active-by-default.
- Verified there is no Hyderabad asset dataset in the app. `GeoMapScreen.js` contains 7 Bengaluru/Delhi/Mumbai wards and 16 assets; `localities.js` is an unverified static list. No assets were seeded and no localities table was created; the locality picker maps to `GET /areas?q=`.
- Added 7 pytest tests for ward list/centroid/search/detail/multipolygon/404 and notice filtering.
- Adopted `ghmc_wards.kml` as the sole ward dataset (ADR-010; supersedes ADR-009): 155 GHMC wards, 148 Polygon + 7 MultiPolygon, 0 invalid, 0 duplicate/empty names, bbox `78.238974956, 17.290716392, 78.621714901, 17.561001298`, 25 boundary-sliver overlap pairs (max 27,281 m²).
- Added `areas.zone` and `areas.circle` (migration `80f7f68cf6d8`); imported zone/circle from the KML.
- Added `GET /wards?q=&zone=` (zone/circle/centroid), `GET /wards/boundaries?tolerance=` (all 155 simplified polygons as one FeatureCollection; 301 KB at 0.0001°, 159 KB at 0.0005°), and zone/circle in `GET /wards/{id}`.
- Rewired `GeoMapScreen`: fetches `/wards/boundaries`, renders all 155 ward polygons with `react-native-svg`, builds the ward list from API data, defaults to Hyderabad, and removed the Bengaluru/Delhi/Mumbai hardcoded wards/assets. Zone filters now list the GHMC zones.
- Added 3 pytest tests for zone filtering, boundary FeatureCollection, and tolerance validation.
- Added `GET /geocode/reverse?lat=&lon=` (auth) as a server-side OSM Nominatim proxy: 1 req/s per process, LRU cache keyed to ~1 m, 8 s timeout, attribution, and a contact User-Agent requirement. Live-verified a Banjara Hills address.
- Added 4 pytest tests for auth, coordinate validation, address mapping, and upstream failure (75 total).
- Phase 6: added `GET /users/me/activity?tab=submitted|confirmed|resolved|tracked`, `GET /users/me/audits` with computed KPIs, and `GET /users/me/impact` using `categories.avoided_cost_inr` over distinct resolved authored/confirmed issues.
- Added `favorite_places` CRUD (`GET/POST/PATCH/DELETE /users/me/favorites`) scoped to the caller, keyed by `area_id` (GHMC ward) and/or an optional point; duplicate `(user, area)` returns 409.
- Added `GET /users/me/export?format=json|csv|geojson`, scoped to issues authored by the caller, with exact coordinates included only for the authenticated author.
- Added `sla_escalations` table and `POST /sla-escalations` (auth, queued by default, duplicate returns 409).
- Added migration `5975bdfe6c06` for `favorite_places` and `sla_escalations`.
- Added 10 pytest tests for activity scoping/personalization, audit KPIs, impact de-duplication, favorites CRUD/ownership, export formats/scoping, and SLA validation (85 total).
- Phase 7: added `OfficialUser`/`AdminUser` dependencies (`official`/`admin`), with citizens receiving 403.
- Added `POST /issues/{id}/status` (forward-only status advancement, timeline event, `resolved_at`), `POST /issues/{id}/resolution-image` (official-owned, validated evidence), and `GET /issues/{id}/resolution-image-url` (signed URL).
- Added moderation: `issues.hidden_at`/`hidden_reason`; hidden issues are absent from the public feed, detail, comments, votes, confirms, activity, audits, impact, and export. Admins can hide/unhide issues and soft-delete/restore comments.
- Added `GET /admin/reports` (author identity for moderation, honest audit logging of views) and `PATCH /admin/reports/{id}` / `PATCH /admin/comments/{id}`.
- Added `admin_audit_log` and `GET /admin/audit-log`; status changes, moderation actions, notice CRUD, and role changes are logged.
- Added admin notice CRUD (`POST/PATCH/DELETE /admin/notices`) and `PATCH /admin/users/{id}/role` (self-change blocked).
- Added a per-user report creation quota (10/hour per process) returning 429.
- Added migration `7a696ab4fc5d` for `admin_audit_log` and issue moderation columns.
- Added 10 pytest tests for role gates, status transitions, resolution evidence, hiding/unhiding, comment moderation, notice CRUD/audit, role assignment, and rate limiting (95 total).
- Phase 8: added `X-Request-ID` middleware, JSON request logs (no query strings/bodies), and configurable `LOG_LEVEL`; CORS exposes the request id.
- Verified `/health` returns 503 with `database: error` when the DB fails; added tests for request-id generation/echo/sanitization and health failure.
- Added CI (`.github/workflows/ci.yml`): PostGIS service, Ruff, format, `alembic upgrade`/`check`, pytest, `pip-audit`, gitleaks. Not yet executed on GitHub Actions.
- Upgraded pytest to 9.0.3 (PYSEC-2026-1845); `pip-audit --skip-editable` now reports no known vulnerabilities.
- Added Vercel config (`backend/vercel.json`: `app/main.py`, 30 s, `sin1`), `.vercelignore`, and documented the `backend/` root + `[tool.vercel] entrypoint`; region matches Supabase `ap-southeast-1`.
- Rehearsed migration rollback (`head → 5975bdfe6c06 → head`) and backup/restore (`pg_dump`/`pg_restore`; 155 areas, 8 categories, head version) on scratch databases.
- Added `scripts/perf_smoke.py`; locally all endpoints 200, slowest ward boundaries 131.63 ms / 159,346 B.
- Secret scan clean (no service-role values, JWTs, cloud keys, or production DB credentials); frontend contains no privileged key references.
- Fixed `.gitignore` so `backend/.env.example` and `frontend/.env.example` are not ignored.
- Added `docs/engineering/release-checklist.md` and updated the operations catalog with verified backup/rollback procedures.
- Phase 9: added `frontend/src/lib/supabase.js` (chunked SecureStore session), `api.js` (typed-ish API client with request errors), `media.js` (compression/EXIF-strip/direct upload), `format.js` adapters, and `images.js` (signed evidence URLs).
- Rewrote `AuthContext` around Supabase email/password signup + login, persistent sessions, `GET/PATCH /users/me`, server-backed preferences, avatar upload, and account deletion. Removed demo auto-login. Email OTP is deferred until SMTP is configured (ADR-011).
- Rewrote `IssuesContext` around the API: feeds, detail, comments, votes, confirmations, create + evidence attach, with optimistic vote updates.
- Wired Home (wards, notices, area issues, activity counts, GPS ward picker), Categories/Feed (server sort, real vote guard), Create Issue (GPS required, real upload, no fake sample photo), Issue Detail (server data, witness control, threaded comments, signed evidence/resolution images), Profile/Edit Profile, Settings (preferences, real export via file/share, delete account), Audits, Impact, Favorites, and Citizen Charter escalations.
- Frontend dependencies installed: `@supabase/supabase-js`, `react-native-url-polyfill`, `expo-secure-store`, `expo-location`, `expo-image-manipulator`, `expo-file-system`, `expo-sharing`.
- GeoMap now treats the 42% viewport as an **area map**: pins/search/ward cards select an area and open the area view with its reported issues, status/severity/sector filters, and a link to the full report. Zone options are derived from real wards; risk counts come from real open-issue counts; the locate button enables distance sorting.
- Added Hyderabad-only demo seed `scripts/seed_demo_data.py`: 9 reports across Banjara Hills, Madhapur, Kukatpally, Gachibowli, Tolichowki, Serilingampally, Jubilee Hills, and Begumpet, with comments, votes, confirmations, and status timelines. No Bengaluru/Delhi/Mumbai data. Idempotent.
- Compliance: `DELETE /users/me` anonymizes the profile, removes personal artifacts, and retains anonymous civic reports; migration `f127b8b90639` adds `profiles.deleted_at` and enables RLS on all application tables; `scripts/check_rls.py`, `scripts/retention_cleanup.py`, and `docs/engineering/privacy-retention.md` added.
- Backend `GET /wards/boundaries` now includes `openIssueCount` per ward for map risk filters.
- Added tests for account deletion and ward open-issue counts (112 total).
- 2026-11-09 GIS check of the device coordinates `17.5705589, 78.4380271`: `ST_Covers` matched 0 of the 155 wards; nearest were `129-SURAM` (1,840 m), `130-SUBHASH NAGAR` (1,871 m), and `125-GAJULARAMARAM` (4,098 m). The displayed `93-BANJARA HILLS` was the default Home filter, not the GPS result.
- Widened the issue acceptance envelope to `lat 17.27–17.60`, `lon 78.22–78.65`; points outside all wards are accepted as `unmatched` with `areaId=null`. Added `GET /areas/nearest` (informational distances, never assigns) and tests.
- Home now shows a GPS notice with the nearest ward/filter explanation; Create Issue shows the nearest ward and allows unmatched submission; API validation errors now display the actual field/message instead of only “Request failed (422)”.
- Added manual ward override (ADR-012, migration `b4f6a2c81d37`): optional `areaId` on `POST /issues`, `area_assignment_status='manual'`, a search box over all GHMC wards, and a “Use My Location” resolver in Create Issue. Manual reports can be submitted even outside the automatic envelope; coordinates remain required and private. Removed the “move closer to the ward centre” favorite error by allowing point-only favorites.
- Added a backend raster tile proxy `GET /api/v1/tiles/{z}/{x}/{y}.png`: official OSM URL with `User-Agent: CivicApp/2.0`, OSM-block detection, OSM France/HOT fallback, in-process LRU cache, and `Cache-Control`. The app requests the proxy (no map key); attribution remains `© OpenStreetMap contributors`. This is development/demo only; OSM policy restricts app-scale use. `EXPO_PUBLIC_TILE_URL` remains the production provider override. 4 tile tests added (112 total).
- Added `scripts/configure_supabase_auth.py` to disable Supabase email confirmation (`mailer_autoconfirm`) for immediate password signup. The dashboard equivalent is Authentication → Providers → Email → Confirm email OFF.

## 5. In progress

Device validation: the app bundles successfully, but it has **not been run in Expo Go on a physical Android device**. Remaining polish: admin/official UI (deferred by the owner), reverse-geocode display for map pins (not needed for the area-only map), Ward Docket/RTI claims (no backend), and Play Store assets. Deployment remains blocked on B-5.

## 6. Blockers

| ID | Blocker | Owner | Status |
|---|---|---|---|
| B-1 | Geography scope | User | **Resolved:** Hyderabad only; sole source `ghmc_wards.kml` (ADR-010; supersedes ADR-009) |
| B-2 | Auth channel: email OTP vs phone OTP (DLT) vs both | User | **Current build:** email + password (ADR-011). Email OTP deferred until SMTP is configured; phone after DLT/provider |
| B-3 | GeoMap assets: backend-managed in MVP vs static until later | User | **Resolved:** no verified Hyderabad asset dataset exists; ship ward map from verified polygons, defer assets rather than seed Bengaluru/Delhi data |
| B-4 | Anonymity semantics: server-side pseudonymity vs unlinkable | User | **Resolved:** server-side pseudonymity; author stored, hidden publicly (ADR-007) |
| B-5 | Supabase project + Vercel MCP credentials | User | **Partially resolved:** Supabase project connected via MCP (URL + publishable key); service-role key not retrieved (backend delegates with the caller token); Vercel credentials still open (Phase 8) |

## 7. Validation and checks

| Check | Result |
|---|---|
| `frontend/package-lock.json` resolved versions | Verified: expo 58.0.22, RN 0.88.1, React 19.3.0, expo-camera 58.0.14 |
| Expo 58 Node engine requirement | Verified: `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0` |
| Local Node version | Verified: v22.19.0 (compatible) |
| Local Python version | Verified: 3.10.8 (below Vercel minimum 3.12) |
| Docker availability | Verified: 28.5.1, daemon running |
| Backend dependency install | Verified: Python 3.13 venv; FastAPI 0.162.2, SQLAlchemy 2.0.57, psycopg 3.3.8, GeoAlchemy2 0.21.0, Alembic 1.20.1 |
| Docker PostGIS | Verified: `postgis/postgis:17-3.5`, PostGIS 3.5 in `extensions`, host port 5433 |
| Alembic migrations | Verified: `alembic upgrade head` through `80f7f68cf6d8 (head)`; `alembic check` no drift |
| Reference seed idempotency | Verified: ran twice; 8 categories, 32 checkpoints, 5 notices, 6 SLAs |
| Ward import | Verified: 155 GHMC areas from `ghmc_wards.kml`, 0 invalid, 0 duplicate/empty names, 25 boundary-sliver pairs |
| Backend tests | **Verified: 112 passed** (`pytest -q`, 2026-11-09) |
| Current migration head | **Verified:** `b4f6a2c81d37 (head)`; `alembic check` no drift |
| Manual ward override | **Verified:** `areaId` + 0,0 coords → 201, status `manual`; unknown area → 422 |
| Area resolution | **Verified:** `17.5705589,78.4380271` → 0 covering wards; nearest 129-SURAM 1,840 m |
| Tile proxy | **Verified:** `GET /api/v1/tiles/13/5880/3689.png` → 200, 26,235-byte PNG, `X-Tile-Provider: osm`, cache header; fallback/UA/502 tests pass |
| Supabase schema | **Verified via MCP:** `b4f6a2c81d37`; 17 app tables created with RLS |
| Supabase reference data | **Verified via MCP:** categories 8, checkpoints 32, notices 5, service standards 6 |
| Supabase wards/demo | **Pending:** run `scripts/sync_supabase.py` with the Supabase direct/session connection string |
| Backend runtime DB | `backend/.env` targets the Supabase **Session pooler** (`aws-0-ap-southeast-1.pooler.supabase.com:5432`). The password is still a placeholder; the direct `db.<ref>` host does not resolve (IPv6-only). Fill the password, sync, restart. Local backend is stopped |
| Supabase connectivity | **Diagnosed:** direct host DNS fails; `aws-0` pooler recognizes `postgres.ndcmhjdssxnhjlovxyaj`, but the supplied password is rejected (`password authentication failed`). 500s are DB auth failures. Reset the DB password in Supabase and paste the new Session pooler URI |
| Frontend bundle | **Verified:** `npx expo export --platform web` → 561 modules, no errors |
| On-device run | **Not performed** (Expo Go/device unavailable in this environment) |
| Seed data | **Verified:** 9 Hyderabad reports, comments/votes/confirmations, idempotent rerun |
| Live API with seed | **Verified:** `/issues` total 8; Kukatpally 1; boundaries 155 features with open counts |
| Account deletion | **Verified:** 403 after deletion; issues/comments anonymized; personal rows removed |
| RLS | **Verified:** `scripts/check_rls.py` reports ON for all 17 tables |
| Retention dry run | **Verified:** `scripts/retention_cleanup.py` reports 0 overdue rows |
| Phase 6 migration | **Verified:** `5975bdfe6c06` applied; `alembic check` reports no drift |
| Phase 7 migration | **Verified:** `7a696ab4fc5d (head)` applied; `alembic check` reports no drift |
| Dependency audit | **Verified:** `pip-audit --skip-editable` → no known vulnerabilities; pytest 9.0.3 |
| Secret scan | **Verified:** regex scan clean; frontend has no privileged credential references |
| CI workflow | Configured (`.github/workflows/ci.yml`); **not executed on GitHub Actions** |
| Perf smoke | **Verified locally:** all 200; slowest ward boundaries 131.63 ms / 159,346 B |
| Migration rollback rehearsal | **Verified:** scratch DB `head → 5975bdfe6c06 → head` |
| Backup/restore rehearsal | **Verified:** scratch restore had 155 areas, 8 categories, head version |
| Vercel deployment | **Not performed** (B-5); config prepared and region aligned (`sin1` / `ap-southeast-1`) |
| Backend lint/format | `ruff check` and `ruff format --check` clean |
| Live API smoke test | Verified: health 200; categories 8; notices 5; SLAs 6; Kukatpally/Banjara Hills matched; outside point unmatched; `GET /issues` 200 empty page; `POST /issues` without token 401 |
| Supabase buckets | Verified: `evidence` private + `avatars` public, both `file_size_limit=1048576`, MIME allowlist JPEG/PNG/WebP |
| Supabase storage policies | Verified: insert limited to `auth.uid()` folder; authenticated select; no client update/delete |
| Supabase advisors | 2 pre-existing warnings on `public.rls_auto_enable()` (not introduced by Phase 4) |
| Live signed upload | **Not validated**: requires a real Supabase user session; API is covered by stubbed tests |
| Client image compression | Not implemented (Phase 9); contract documented in `docs/engineering/media-pipeline.md` |
| Live ward map API | Verified: `GET /wards?q=Kukatpally` → `121-KUKATPALLY`, zone `KUKATPALLY ZONE`, circle `24-KUKATPALLY`; detail returns a Polygon |
| Live ward boundaries | Verified: 155 features; 301,755 bytes at tolerance 0.0001; 159,346 bytes at 0.0005 |
| KML import | Verified: 155 areas, 0 invalid geometries, 0 duplicate/empty names, 25 boundary-sliver overlap pairs |
| Live notices filter | Verified: `category=water&includeExpired=true` → `notice-hmwssb-01` |
| Live reverse geocode | Verified once against Nominatim: `17.4156,78.4350` → Banjara Hills, Hyderabad, Telangana, 500034 |
| Hyderabad asset data | Verified absent; old map data was Bengaluru/Delhi/Mumbai and is removed from `GeoMapScreen` |
| Frontend GeoMap | Syntax-checked with esbuild (130.1 KB bundle); **not run on a device** (no `node_modules`) |
| KML licence | **Unconfirmed**; attribution must be confirmed by the owner |
| Nominatim User-Agent | Placeholder only; production must include a real contact URL/email (TD-B21) |
| Frontend tests / lint / CI | Not configured |
| Expo Go device test against local backend | Not performed |
| EAS Build / Submit / Play Console | Not configured |

## 8. Risks and open questions

See `docs/engineering/risk-register.md` and `docs/engineering/technical-debt.md`.

Top risks: no verified Hyderabad asset data; Nominatim User-Agent contact and public-instance usage limits; the OSM tile proxy is development-only (OSM policy restricts app-scale use; production needs approval, a licensed provider, or self-hosting); lack of GPS/coordinate provenance in the client; media privacy/EXIF; anonymous-report abuse; password reset/email confirmation need SMTP; Android LAN connectivity/firewall; Expo Go native-module limits (push); and Google Play data-safety/privacy-policy requirements. KML is treated as open per the owner.

## 9. Next steps

1. In `backend/.env`, replace `<SUPABASE_DB_PASSWORD>` in **both** `DATABASE_URL` and `SUPABASE_DATABASE_URL`. They already use the working Session pooler `aws-0-ap-southeast-1.pooler.supabase.com:5432` (user `postgres.ndcmhjdssxnhjlovxyaj`). The direct `db.<ref>` host is IPv6-only and fails DNS here. Then run `python -m scripts.sync_supabase` to import 155 wards + 9 demo reports. Local Docker is not required for runtime.
2. Start FastAPI (`uvicorn app.main:app --host 0.0.0.0 --port 8000`) and verify `GET /api/v1/categories`, `/wards/boundaries`, and `/issues` against Supabase.
3. Run the app in **Expo Go** on a physical Android device against the LAN API; confirm `frontend/.env` points at the PC LAN IP, then `npx expo start -c`. Validate password signup/login, manual ward selection, create-with-GPS, upload, feed, detail, votes/comments, profile/preferences, export, the area map, and the tile proxy.
4. Deploy to Vercel + Supabase once B-5 credentials are supplied; follow the deployment runbook, run the release checklist, and rehearse a real rollback.
5. Obtain a verified Hyderabad asset dataset; assets/inspections remain deferred. KML is treated as open per the owner.
6. Decide when to build the admin/official UI (APIs are ready).
7. Add Play Store assets/privacy policy and configure EAS when release work begins.
5. Integrate the Expo client (Supabase client, session persistence, API client, GPS, email/password UI) and validate on a physical Android device through **Expo Go** against the local backend over LAN.
6. Add CI and broaden tests; keep the 85-test baseline green.
7. Configure `android.package`, URL scheme, `eas.json`, EAS project/signing, and Play Console prerequisites.
8. Build an EAS preview **APK** only for standalone testing; build a production **AAB** and submit with EAS Submit when release-ready.
9. Deploy to Vercel + Supabase after MCP credentials are supplied; switch the app to the HTTPS production API.
10. Complete Play Store listing, privacy policy, data safety form, content rating, internal testing, and production rollout.

## 10. Recommended model path

- Next task (Expo Go device validation): **general coding**; high reasoning only if device/API integration fails.
- Deployment/release: **high reasoning** + **security-focused review** for the release checklist.
- Auth, roles, moderation, uploads, anonymity: **security-focused review**.
- Routine endpoint/test work after scaffolding: **general coding**.
- Documentation-only reconciliation: **fast**.
