# Phase 9 — Manual Validation Checklist

> Use this on the physical Android device in Expo Go. Items marked **[auto]** were already verified locally; **[you]** require a device, Supabase email, or credentials. Do not mark an item done without observing the result.

## 0. Pre-flight (5 minutes)

- [ ] `docker compose ps` → `argus-postgis` is `Up (healthy)`
- [ ] `cd backend && ./.venv/Scripts/alembic.exe current` → `b4f6a2c81d37 (head)`
- [ ] `./.venv/Scripts/python.exe -m scripts.seed_demo_data` → `0 new reports, 9 already present` (or creates missing ones)
- [ ] `./.venv/Scripts/python.exe -m scripts.check_rls` → `ON` for all 17 tables
- [ ] Backend is running: `http://<PC-LAN-IP>:8000/health` → 200
- [ ] Windows firewall allows TCP 8000 (rule `Argus API 8000` exists)
- [ ] `frontend/.env` `EXPO_PUBLIC_API_URL` matches the **current PC LAN IP**, not localhost
- [ ] `frontend/.env` has the Supabase URL + anon/publishable key (no service-role key)
- [ ] Supabase → Authentication → Providers → Email → **Confirm email is OFF** (immediate password signup); `scripts/configure_supabase_auth.py --apply` can set it with a Management API token
- [ ] SMTP is optional for now (needed for password reset / confirmation later)
- [ ] Map tiles load through `EXPO_PUBLIC_API_URL/api/v1/tiles/{z}/{x}/{y}.png`; `curl -I` shows `200 image/png`, `X-Tile-Provider`, and `Cache-Control`
- [ ] If the map still shows the OSM “Access denied” tile, stop Metro and run `npx expo start -c`, then reload the app
- [ ] `cd frontend && npx expo-doctor` → 20/20
- [ ] `cd frontend && npx expo start --lan` starts Metro; scan the QR in Expo Go on the same Wi-Fi

## 1. Cold start and guest mode

- [ ] App opens **without auto-login**; Profile tab shows `Guest Citizen`
- [ ] Home loads a default Hyderabad ward (Banjara Hills) and does not show an API error bar
- [ ] Municipal notices load (not the old hardcoded local list)
- [ ] Bottom tabs: Categories, Home, Map, Profile all render
- [ ] No red screen, no “EXPO_PUBLIC_API_URL” warning

## 2. Authentication

- [ ] Auth modal offers **Sign In** and **Create Account** with email + password
- [ ] Invalid email is rejected client-side
- [ ] Password shorter than 6 characters is rejected
- [ ] Create Account with a **new email** signs in immediately and creates a profile
- [ ] Sign out, then Sign In with the same email/password
- [ ] Wrong password is rejected with an error
- [ ] Close and reopen the app → session persists
- [ ] Profile shows the email-derived name/handle; edit it later
- [ ] Sign out → Profile returns to Guest; public tabs still work
- [ ] Unauthenticated vote/comment/confirm/create opens the sign-in modal instead of crashing

## 3. Home / area context

- [ ] Locality picker search returns GHMC wards by name/number/zone
- [ ] “Use Current Location” requests permission and selects the GPS ward (or explains `ambiguous`/`outside GHMC`)
- [ ] Selecting a ward reloads the ward widget and issues below
- [ ] Notices modal category filters work (`All`, Water, Roads, Power, Weather)
- [ ] Activity bell count matches the user’s witnessed reports
- [ ] Ward “at a glance” count reflects real issues for that ward
- [ ] Recently Resolved appears for a ward with a resolved seed report (Banjara Hills / Madhapur / Jubilee Hills)

## 4. Create report (the core flow)

- [ ] Submit without “Use My Location” is blocked with the GPS message
- [ ] Location permission grant → coordinates + derived ward are shown
- [ ] If the GPS point is outside all KML wards, the app shows the nearest ward and allows manual selection
- [ ] Ward search returns GHMC wards; selecting one shows the selected-ward card and marks the report `manual`
- [ ] “Use My Location” resolves and selects the ward when the point is inside a ward
- [ ] A manual ward allows submission even when the GPS point is outside the automatic envelope
- [ ] If a 422 still occurs, the banner shows the actual field/message (not just “Request failed (422)”)
- [ ] Title < 5 chars is blocked; description empty is blocked; location empty is blocked
- [ ] Anonymous toggle works; public payload shows `Anonymous Citizen`
- [ ] Camera/gallery photo is accepted
- [ ] Photo is compressed/re-encoded and uploads; no >1 MiB error
- [ ] Report is created successfully
- [ ] Report appears in the feed **for a second account** (and for a guest)
- [ ] Report detail shows the author (or anonymous), ward, timeline, and photo
- [ ] Database check: `issues.author_id` is the signed-in user for a non-anonymous report
- [ ] Exact coordinates are **not** present in any public API response

## 5. Feed, detail, engagement

- [ ] Category grid loads the 8 API categories
- [ ] Feed sort `trending`, `new`, `top` changes order
- [ ] Pull-to-refresh reloads the feed
- [ ] Vote up → count +1; tap again → cancels; switch to down → count changes correctly
- [ ] Vote state survives app restart (server-persisted)
- [ ] Witness/confirm asks for GPS; succeeds within 2 km; a far-away confirmation is rejected
- [ ] Confirmation count and “Witnessed” state update
- [ ] Comment posts and appears; reply posts and nests; depth >3 is rejected
- [ ] Comment vote toggles
- [ ] Anonymous comment hides the author
- [ ] Evidence image opens from detail; resolution image appears for a resolved report
- [ ] Share action works

## 6. Area map (42% view)

- [ ] The top 42% is an **area map**; there is no pin-drop flow
- [ ] Search + Enter opens the first matching ward
- [ ] Tapping a ward card opens the area view
- [ ] Tapping a ward pin opens the area view
- [ ] Area view lists **reported issues** below (not assets)
- [ ] Issue sector/severity/status filters work
- [ ] Sort (urgency/recent/category) works
- [ ] “View Full Civic Report” opens the report detail and Back returns to the area
- [ ] Zone filter options are real GHMC zones
- [ ] Risk filter reflects real open-issue counts
- [ ] Locate button enables distance sorting
- [ ] Home → “Ward at a Glance” opens the map with that ward selected
- [ ] OSM attribution is visible

## 7. Profile, settings, civic tools

- [ ] Edit profile saves name/address/area/city/state/pincode (email/phone are read-only)
- [ ] Avatar upload works; public avatar URL renders
- [ ] Preferences persist across restart: pseudonymous mode, GPS radius, lock timeout, notification channels, language, cache preference
- [ ] My Audits shows real KPIs and the user’s reports
- [ ] Civic Impact shows real value/sector breakdown (or the empty state)
- [ ] Add favorite via GPS; pin/unpin persists
- [ ] Citizen Charter loads real SLAs; tapping a card creates an escalation (no 409 on first try)
- [ ] Export GeoJSON/CSV/JSON downloads or shares a file containing only the user’s records
- [ ] Delete Account (use a throwaway account) → signed out; public reports remain anonymous; favorites/preferences/votes removed

## 8. Compliance and privacy

- [ ] `scripts/check_rls.py` still reports ON after any migration
- [ ] `scripts/retention_cleanup.py` dry run reports 0 overdue rows (or the expected count)
- [ ] No service-role, DB URL, JWT secret, or privileged key in the app bundle or `frontend/.env`
- [ ] Exact coordinates never appear in issue/comment/feed/detail payloads
- [ ] Anonymous reports/comments never expose the author
- [ ] Account-deleted token returns 403
- [ ] Export of user A never contains user B’s reports

## 9. Backend quality gates

- [ ] `pytest -q` → 112 passed
- [ ] `ruff check .` → clean
- [ ] `ruff format --check .` → clean
- [ ] `alembic check` → no drift
- [ ] `pip-audit --skip-editable` → no known vulnerabilities
- [ ] Seed rerun is idempotent
- [ ] Push the repository and confirm `.github/workflows/ci.yml` passes on GitHub Actions
- [ ] `npm audit` → acknowledge the 7 moderate Expo build-tooling advisories (TD-B30)

## 10. Deployment (only when B-5 credentials exist)

- [ ] Vercel project Root Directory = `backend/`
- [ ] `vercel.json` region `sin1` matches Supabase `ap-southeast-1`
- [ ] Env vars set per environment; `SUPABASE_SERVICE_ROLE_KEY` is server-only
- [ ] `DATABASE_URL` uses Supavisor transaction mode (6543); migrations use a direct/session connection
- [ ] No migrations run at build or cold start
- [ ] Preview deployment passes this checklist
- [ ] Production `/health` 200; JWKS auth works; forged/expired tokens 401
- [ ] Real `vercel rollback` rehearsed
- [ ] Supabase backups/PITR enabled and a restore tested
- [ ] Play Store: AAB, privacy policy, data-safety form, content rating, internal testing

## 11. Known deferred — do not treat as failures

- Admin/official UI (APIs exist; UI deferred by owner)
- Ward Docket, RTI generation, DigiLocker, push notifications (no backend by design)
- Hyderabad asset dataset / inspections (no verified data)
- Public coordinate masking (no home anchor captured)
- Reverse-geocode display on the map (map is area-only)
- Cosmetic profile claims (scores, XP, accuracy, hashes)
- Nominatim production contact (owner deferred)
- KML exact licence wording (owner confirmed open use; attribution wording pending)
