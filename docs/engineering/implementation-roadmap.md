# Implementation Roadmap

> Status: **planned**. Ordered by dependency and risk. Estimates are for one experienced developer; they exclude the frontend cut-over effort, which is listed separately.

## Prioritization rule

1. Unblock decisions (they change the schema and auth).
2. Build a thin vertical slice: auth → create report → feed → detail.
3. Add engagement and media.
4. Add reference/map depth.
5. Add civic tools and administration.
6. Harden, test, deploy the API.
7. Cut the client over and validate on a physical Android device through Expo Go; remove mocks.
8. Produce Play Store artifacts (preview APK, production AAB) only when release-ready.

## Phase 0 — Decisions and scaffolding (0.5–1 day)

**Prerequisite:** user approval and decisions B-1…B-4 (see `risk-register.md`).

- Finalize geography scope, auth channel, anonymity semantics, GeoMap scope.
- Confirm the Android-first delivery constraints (Expo Go, LAN testing, EAS later).
- Scaffold `backend/` layout, `pyproject.toml`, `.python-version`, settings, logging.
- Add `docker-compose.yml` with PostGIS.
- Add Ruff/Pytest configuration.
- Add `.env.example`; define `EXPO_PUBLIC_API_URL` for local LAN and production HTTPS.
- Wire Vercel environment variables later.

**Acceptance:** `uvicorn app.main:app --host 0.0.0.0 --port 8000` starts locally; `/health` returns 200; Docker PostGIS is reachable; a physical Android device can reach `/health` through the PC LAN IP.

## Phase 1 — Database foundation (1–2 days)

- Alembic init + naming convention.
- Migrations: areas, categories, category_checkpoints, service_standards, notices.
- Enable PostGIS in `extensions`.
- Idempotent seed: 8 categories, 32 checkpoints, 5 notices, 6 SLAs.
- Do **not** seed area names or fabricate ward labels in this phase.
- Verify seed twice (same counts).

**Acceptance:** clean DB `upgrade head` + seed succeeds twice; reference endpoints read the data; `areas/at` returns `unmatched` for every point while the `areas` table is empty; no fabricated area label.

## Phase 1.5 — Hyderabad ward dataset import (0.5–1 day)

- Use `wards_hyderabad.geojson` as the sole boundary dataset (ADR-009).
- Import only the ward `Name` and polygon into `areas(id, name, geom)`.
- Force 2D, set SRID 4326, apply `ST_MakeValid`, and upsert by name.
- Do not store OSM metadata or any other source properties in application tables.
- Validate and report: 145 features, 145 unique names, 0 empty names, 0 invalid geometries, 0 overlapping pairs, geometry types, bbox, and point-in-polygon samples.
- Preserve the original GeoJSON file and attribution (`© OpenStreetMap contributors`, ODbL 1.0).
- Implement `GET /areas`, `GET /areas/at`, `GET /areas/{id}`.

**Acceptance:** import is reproducible and idempotent; `areas` contains exactly `id`, `name`, `geom`; point-in-polygon returns matched/unmatched/ambiguous without guessing; the original file and attribution are preserved.

## Phase 2 — Auth, profiles, preferences (1–2 days) — **backend done, client pending**

- JWKS verification dependency; `current_user`. (`get_optional_user` deferred until a public endpoint needs personalization.)
- Lazy profile + preferences creation on first authenticated request. **Done.**
- `GET/PATCH /users/me`, `GET/PUT/PATCH /users/me/preferences`. **Done.**
- Avatar signed upload + confirm. Deferred to Phase 4 (Storage).
- Staging-only demo mode: not implemented; production must remove the demo path at cut-over.
- Tests: invalid/expired token, profile isolation, preference round-trip. **Done (16 Phase 2 tests; 26 total).**

**Acceptance:** a real Supabase email-OTP user can read/update their profile; no endpoint trusts client identity. *Backend verified with locally signed test tokens; real Supabase project verification is blocked on B-5 credentials.*

## Phase 3 — Issue vertical slice (3–5 days) — **backend done, client pending**

- Migrations: issues, private locations, events, votes, confirmations, comments, comment votes. **Done (`d25fc97bcb78`).**
- `GET /issues` with area/proximity/text/urgent filters, sorting, pagination, optional personalization. **Done.**
- `GET /issues/{id}` with 4-step timeline and derived area. **Done.**
- `POST /issues` with **required coordinates**, exact/private storage, point-in-polygon area derivation, public ref, initial vote, reported event. **Done.** Public geometric masking deferred (no home anchor in the schema/client yet).
- `POST /issues/{id}/confirm` requires witness coordinates; rejects >2 km. **Done.**
- Vote/confirm toggles with row locks and atomic counters. **Done.**
- `GET/POST /issues/{id}/comments`, comment votes, depth enforcement, threaded response. **Done.**
- Tests for sorting, toggles, privacy projection, ownership. **Done (21 Phase 3 tests; 47 total).**

**Acceptance:** create → vote → confirm → comment → feed/detail works end-to-end against PostGIS; anonymous payloads leak nothing. *Backend verified with automated tests; client wiring is Phase 9.*

## Phase 4 — Media (1–2 days) — **backend done, client compression pending**

- Signed upload endpoint with MIME/size/path validation. **Done; ≤1 MiB.**
- Private evidence bucket and public avatar bucket. **Configured live on Supabase (`evidence` private, `avatars` public).**
- Signed download URL endpoint for evidence. **Done.**
- Orphan cleanup design (cron later). Deferred (TD-B17).
- Client contract: direct PUT, no bytes through Vercel. **Documented; client implementation is Phase 9.**
- Client compression: visually lossless ladder, EXIF stripping, hard stop at 1 MiB. **Contract in `docs/engineering/media-pipeline.md`; implementation in Phase 9.**

**Acceptance:** a compressed image uploads directly to Supabase and is readable through a short-lived signed URL; oversize/MIME attacks are rejected. *API + bucket limits verified with tests and live bucket inspection; end-to-end upload awaits a real Supabase user session (Phase 9).*

## Phase 5 — Reference and map (2–3 days) — **backend done; assets blocked on data**

- `GET /localities?q=` with landmark search. **Not implemented:** no verified locality dataset; the picker maps to `GET /areas?q=`.
- `GET /notices` with category/text/expiry filtering. **Done.**
- `GET /wards` with zone/circle/centroid; `GET /wards/{id}` with GeoJSON polygon; `GET /wards/boundaries` for the map. **Done, backed by `ghmc_wards.kml` (155 wards, ADR-010).**
- `assets` + `asset_inspections` migrations and seeds. **Deferred (B-3):** the only in-repo asset data is Bengaluru/Delhi/Mumbai; no fabrication.
- `GET /wards/{id}/assets`, `GET /assets/{id}`. **Deferred with assets.**
- Distance semantics: proximity requires `near`+`radiusM`; no fabricated distances. **Documented.**

**Acceptance:** GeoMap can render wards from the API without hardcoded arrays; notice expiry is enforced. Assets cannot be rendered truthfully until a verified Hyderabad dataset exists.

## Phase 6 — Activity and civic tools (2–3 days)

- `GET /users/me/activity` with the four tabs.
- `GET /users/me/audits` + computed KPIs.
- `GET /users/me/impact` using agreed avoided-cost data.
- Favorites CRUD.
- Export (GeoJSON/CSV/JSON) with ownership scoping.
- SLA list + escalation endpoint.

**Acceptance:** profile pages render real user data; export returns a valid file with only the caller's records.

## Phase 7 — Administration and moderation (2–3 days)

- Official/admin roles and dependencies.
- Status advancement + resolution image; timeline event.
- Asset inspection recording.
- Moderation list/queue, hide/soft-delete.
- Notice/asset admin CRUD.
- Admin audit log for sensitive actions.
- Rate-limit report creation.

**Acceptance:** officials can advance status; citizens get 403; sensitive actions are logged.

## Phase 8 — Hardening and deployment (2–3 days)

- Full test suite + CI (lint, tests, migration check, dependency/secret scan).
- `/health` with DB check; structured logs; request ids.
- Vercel deployment with Supabase; region and pooler configuration.
- Backups/restore procedure; rollback rehearsal.
- Performance smoke on seeded data.
- Security review checklist.

**Acceptance:** preview and production deployments pass the release checklist; no secrets in the client; rollback verified.

## Phase 8.5 — Android build and Play Store readiness (1–2 days)

- Set `android.package`, URL scheme, app version, and `versionCode`.
- Link the EAS project and configure Android signing credentials (EAS-managed).
- Add `eas.json` profiles: development (dev client), preview (APK), production (AAB).
- Build a preview APK only when standalone device testing is needed; install and test.
- Build a production AAB and upload it to Play Console internal testing with EAS Submit.
- Complete the Play listing, privacy policy, data safety form, and content rating.
- Verify the release build uses the HTTPS production API and does not allow cleartext.
- Secret-scan the bundle for service-role/DB credentials.

**Acceptance:** an internal-testing AAB installs from Play; auth/uploads/votes work against production; no privileged credentials or cleartext traffic in the release.

## Phase 9 — Frontend cut-over and Expo Go validation (3–5 days, separate track)

- Add Supabase client + secure session storage.
- Replace fake OTP with 6-digit email OTP; remove demo login from production paths.
- Add API client with JWT and error handling; use the LAN IP in development and HTTPS in production.
- Add `expo-location`; make coordinates mandatory at create/confirm; display real GPS and handle `area: null` (unmatched/ambiguous).
- Add `expo-image-manipulator`; compress and strip EXIF before upload.
- Replace `IssuesContext` mocks with server data + optimistic updates.
- Replace static categories/notices with the API; map the old locality picker to `GET /areas?q=`.
- GeoMap: already fetches `GET /wards/boundaries` and renders 155 GHMC wards; remove the remaining Bengaluru/demo assumptions and validate landmarks/pins on-device. No assets until verified data exists.
- Add tap-to-pin: inverse-project the tap, call `GET /areas/at` for the authoritative ward, and (when signed in) `GET /geocode/reverse` for the address; show attribution.
- Add area search and proximity search using the device location.
- Implement real export download.
- Remove fake GPS/export/cache/DigiLocker/notifications or label them clearly.
- Test on a physical Android device via **Expo Go** against the local FastAPI/PostGIS stack; do not build APKs for routine iteration.

**Acceptance:** the app runs against the API with no mock issues on a physical Android device through Expo Go; auth survives restart; photos upload; votes/comments persist; the device reaches the local backend over LAN.

## Phase 10 — Later (not in MVP)

- Phone OTP after DLT/provider setup.
- Push notifications and token registration.
- Real DigiLocker integration.
- RTI PDF generation and PIO directory.
- Ward officials/meetings/RSVP.
- Realtime votes/comments.
- Offline queue/Wi-Fi-only sync.
- Multi-language content.
- Municipal system integrations.

## Suggested milestones

| Milestone | Phases | Outcome |
|---|---|---|
| M1 — Skeleton | 0–1 | Local DB, schema, seeds, health |
| M1.5 — Hyderabad wards | 1.5 | 145 ward polygons imported (name + polygon), point-in-polygon |
| M2 — Authenticated slice | 2–3 | Real user, issue lifecycle |
| M3 — Evidence | 4 | Real photo upload |
| M4 — Full read surface | 5 | Map/notices/localities from API |
| M5 — Profile tools | 6 | Activity, favorites, impact, export |
| M6 — Operable | 7–8 | Admin, tests, deployment |
| M7 — Live app | 9 | Frontend cut over, tested via Expo Go on a device |
| M8 — Android distribution | 8.5 | Preview APK, Play internal testing AAB |

## Out-of-scope risks that affect the schedule

- SMS OTP/DLT onboarding can take days to weeks.
- Official GHMC ward boundaries and docket data may require licensing or manual collection.
- DigiLocker onboarding is external and slow.
- A real municipal integration may not have an available API.
