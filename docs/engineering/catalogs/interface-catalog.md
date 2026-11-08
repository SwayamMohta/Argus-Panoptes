# Interface Catalog — APIs, Events, Integrations

> Status: **proposed**, except the Phase 0–7 endpoints (health, reference/notices, areas/wards, users/me, preferences, issues/engagement, media, civic tools, admin/moderation), which are implemented. Base path `/api/v1`. JSON is camelCase to match the Expo client. All authenticated calls use `Authorization: Bearer <Supabase access token>`, verified in FastAPI via JWKS.

## 1. Auth interface (Supabase-managed)

FastAPI does **not** implement OTP or token issuance. The client calls Supabase Auth directly.

| Operation | Supabase endpoint | Notes |
|---|---|---|
| Sign up with password | `POST /auth/v1/signup` | Current build: `{email, password}`; email confirmation is disabled so a session is returned immediately (ADR-011) |
| Sign in with password | `POST /auth/v1/token?grant_type=password` | Current build: `{email, password}` |
| Send email OTP | `POST /auth/v1/otp` | Deferred; requires SMTP + the `{{ .Token }}` Magic Link template |
| Verify email OTP | `POST /auth/v1/verify` | Deferred; `{email, token, type:"email"}` |
| Send phone OTP | `POST /auth/v1/otp` | `{phone}`; SMS provider required; India DLT obligations |
| Verify phone OTP | `POST /auth/v1/verify` | `{phone, token, type:"sms"}` |
| Refresh | `POST /auth/v1/token?grant_type=refresh_token` | |
| Sign out | `POST /auth/v1/logout` | |
| Current auth user | `GET /auth/v1/user` | |
| JWKS | `GET /auth/v1/.well-known/jwks.json` | Used by FastAPI to verify asymmetric JWTs |

**OTP length:** set explicitly to 6 digits and update the UI. The current 4-digit input cannot work with SMS OTP (6–10 digits).

## 2. Common API conventions

### Authentication levels

- **Public** — no token required; if a valid token is supplied, personalized fields are added.
- **Auth** — valid Supabase JWT required.
- **Official** — Auth + `profiles.role in ('official','admin')`.
- **Admin** — Auth + `profiles.role = 'admin'`.

### Pagination

Query: `page` (default 1), `limit` (default 20, max 100). Response:

```json
{ "data": [], "pagination": { "total": 142, "page": 1, "totalPages": 8 } }
```

### Errors

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Title must be 5-100 characters", "details": [] } }
```

Statuses: 400 malformed, 401 missing/invalid token, 403 forbidden, 404 not found, 409 conflict/idempotent state conflict, 413 too large, 422 Pydantic validation, 429 rate limited.

### Issue response shape (feed and detail)

```json
{
  "id": "…uuid…",
  "publicRef": "REP-RD-2026-X81A",
  "categoryId": "roads",
  "title": "…",
  "description": "…",
  "location": "Banjara Hills, Road No. 12 Junction",
  "localityId": "banjara_hills",
  "ward": "Ward 98",
  "zone": "Khairatabad Zone",
  "author": "u/civic_scout_91",
  "authorBadge": "Civic Steward",
  "isAnonymous": false,
  "image": "https://…signed…",
  "imageCaption": "…",
  "createdAt": "2026-11-04T07:15:00Z",
  "timeAgo": "2h ago",
  "upvotes": 124,
  "userVote": 0,
  "confirmationsCount": 24,
  "userConfirmed": false,
  "status": "in_progress",
  "statusLabel": "In Progress",
  "isUrgentHazard": false,
  "commentsCount": 32
}
```

Detail adds `timeline[]`, `resolvedImage`, and optionally the first page of comments. Timeline steps retain the client's shape:

```json
{ "key": "reported", "label": "Reported", "date": "Nov 02, 09:15 AM", "occurredAt": "…", "description": "…", "completed": true }
```

## 3. Endpoint inventory

### 3.1 System

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| GET | `/health` | Public | Liveness/readiness, DB ping | P1 |
| GET | `/api/v1/meta` | Public | App version, OTP length, upload limits, feature flags | P2 |

### 3.2 Reference data

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| GET | `/api/v1/categories` | Public | 8 categories + checkpoints + metrics | P1 |
| GET | `/api/v1/categories/{id}` | Public | Single category incl. rubric | P1 |
| GET | `/api/v1/areas?q=` | Public | Area search by ward `name` | P1.5 |
| GET | `/api/v1/areas/at?lat=&lon=` | Public | Point-in-polygon lookup: matched / unmatched / ambiguous | P1.5 |
| GET | `/api/v1/areas/nearest?lat=&lon=&limit=` | Public | Nearest GHMC wards with metre distances (informational; never assigns) | **P9 done** |
| GET | `/api/v1/areas/{id}` | Public | Area detail | P1.5 |
| GET | `/api/v1/wards?q=&zone=` | Public | Ward list with zone, circle, centroid; sorted by name | **P5 done** |
| GET | `/api/v1/wards/boundaries?tolerance=` | Public | All wards as one simplified GeoJSON FeatureCollection for the map | **P5 done** |
| GET | `/api/v1/wards/{id}` | Public | Ward detail with full polygon as GeoJSON | **P5 done** |
| GET | `/api/v1/areas/{id}/assets?sort=&sector=&severity=&status=` | Public | Assets in an area | **deferred: no verified Hyderabad dataset** |
| GET | `/api/v1/assets/{id}` | Public | Asset dossier | **deferred: no verified Hyderabad dataset** |
| GET | `/api/v1/notices?category=&q=&includeExpired=` | Public | Active municipal notices (category/text/expiry) | **P5 done** |
| GET | `/api/v1/service-standards` | Public | Citizen Charter/SLA rows | P2 |

**Areas:** the sole geography source is `ghmc_wards.kml` (155 GHMC wards; ADR-010), superseding `wards_hyderabad.geojson`. `areas` stores `id`, `name`, `zone`, `circle`, and `geom`. `areas/at` returns `{status, area, candidates}`; `status` is `matched`, `unmatched`, or `ambiguous`. It never returns a nearest/fabricated area. `/areas/nearest` is informational only and never assigns a ward. Users do not submit an area. `wards/boundaries` is a read-only map projection of the same table (default tolerance 0.0001°, client asks for 0.0005°).

**Acceptance envelope:** issue creation accepts coordinates in a small envelope around the KML bbox (`lat 17.27–17.60`, `lon 78.22–78.65`). Points inside the envelope but outside every ward are stored as `unmatched` with `areaId=null`; the app shows the nearest ward and distance. This lets citizens at the dataset edge submit without guessing a ward.

**Distance:** proximity filters require a caller position (`lat`,`lon`) or `near` plus `radiusM`. Do not fabricate distances from text or ward labels.

**Localities:** there is no verified locality/landmark dataset. The client locality picker maps to `GET /areas?q=` (ward names). Do not create a localities table from the static frontend constants.

**Assets:** the old GeoMap data was Bengaluru/Delhi/Mumbai and has been removed from the screen. No asset endpoints or seeds ship until a verified Hyderabad asset source exists (B-3).

**Map client contract:** `GeoMapScreen` fetches `GET {EXPO_PUBLIC_API_URL}/api/v1/wards/boundaries?tolerance=0.0005` once, draws all ward polygons, and uses `properties.id/name/zone/circle/center` for the ward list and selection. No hardcoded city data. The screen requires `EXPO_PUBLIC_API_URL` and a reachable backend.

### 3.3 Issues and engagement

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| GET | `/api/v1/issues` | Public + optional | Feed; filters below. Returns `{items,total,page,limit}` | **P3 done** |
| GET | `/api/v1/issues/{id}` | Public + optional | Dossier with 4-step timeline | **P3 done** |
| GET | `/api/v1/issues/{id}/comments?page=&limit=` | Public + optional | Threaded comments; `total` counts top-level roots | **P3 done** |
| POST | `/api/v1/issues` | Auth | Create report | **P3 done** |
| PATCH | `/api/v1/issues/{id}` | Auth (author) | Edit title/description/location before review | P9 |
| DELETE | `/api/v1/issues/{id}` | Auth (author/admin) | Soft delete | P9 |
| POST | `/api/v1/issues/{id}/vote` | Auth | Toggle/switch vote `{direction:1|-1}` | **P3 done** |
| POST | `/api/v1/issues/{id}/confirm` | Auth | Toggle witness `{lat,lon}` (required; >2 km rejected) | **P3 done** |
| POST | `/api/v1/issues/{id}/comments` | Auth | Add top-level comment/reply `{text,parentCommentId?,isAnonymous?}` | **P3 done** |
| POST | `/api/v1/comments/{id}/vote` | Auth | Toggle comment vote `{direction:1|-1}` | **P3 done** |
| DELETE | `/api/v1/comments/{id}` | Auth (author/admin) | Soft delete | P9 |

`GET /api/v1/issues` query parameters:

- `categoryId` (one of 8), `status`, `areaId`, `areaAssignmentStatus` (`matched`,`unmatched`,`ambiguous`), `authorHandle`
- `sortBy`: `trending` (default), `new`, `top`, `resolved`
- `q`: text search over title/description/location
- `bbox=minLon,minLat,maxLon,maxLat` or `near=lat,lon&radiusM=…` (proximity)
- `isUrgent=true`
- `page`, `limit`

Area-based filtering uses `areaId`; proximity uses `near`/`radiusM`. Searching by a locality name uses `GET /areas?q=` first, then `areaId`.

Sorting:
- `trending`: `vote_score*1.5 + comments_count*2 DESC, created_at DESC`
- `new`: `created_at DESC`
- `top`: `GREATEST(vote_score,0) DESC, created_at DESC`
- `resolved`: filter `status='resolved'`, `resolved_at DESC`

Vote semantics (preserve client): same direction cancels; opposite switches; net count never below 0. Return `{issueId, upvotes, userVote}`.

Confirm semantics: toggle; return `{issueId, confirmationsCount, userConfirmed}`. If coordinates are supplied and a public geom exists, store `distance_m` and optionally reject > configured radius (recommended 2 km; configurable).

Create request:

```json
{
  "categoryId": "roads",
  "title": "Dangerous pothole near the main junction",
  "description": "…",
  "location": "Banjara Hills, Road No. 12",
  "coordinates": { "lat": 17.4156, "lon": 78.4350 },
  "areaId": "optional-manual-ward-uuid",
  "isAnonymous": false,
  "priority": "standard"
}
```

Validation: title 5–100 after trim; description 1–500 after trim; `location` non-empty; category exists; **coordinates are required**. Without `areaId`, coordinates must be within the acceptance envelope (`lat 17.27–17.60`, `lon 78.22–78.65`). With `areaId`, the manual ward is used and the envelope check is skipped; the issue is marked `area_assignment_status='manual'`. Evidence is attached after creation via `POST /issues/{id}/image` (Phase 4), never accepted unvalidated at create time. The server:
1. stores the exact coordinate in the private location record;
2. uses the supplied `areaId` (manual) or derives one by point-in-polygon (matched/unmatched/ambiguous; never guessed);
3. sets author, public ref, status `reported`, initial vote, and the `reported` event.

Response includes `areaId`, `area` (ward name), and `areaAssignmentStatus`. A client-supplied area/ward field is ignored or rejected.

### 3.4 Media (Phase 4)

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| POST | `/api/v1/media/upload-url` | Auth | Issue a signed upload URL (`{kind,contentType,sizeBytes}`; ≤1 MiB) | **P4 done** |
| POST | `/api/v1/issues/{id}/image` | Auth (author) | Attach validated evidence `{path,caption?}` | **P4 done** |
| GET | `/api/v1/issues/{id}/image-url` | Auth | Short-lived signed evidence URL | **P4 done** |
| POST | `/api/v1/users/me/avatar` | Auth | Attach a validated avatar `{path}` | **P4 done** |
| POST | `/api/v1/users/me/avatar/upload-url` | Auth | Superseded by `/media/upload-url` with `kind=avatar` | — |

Upload contract:

- `kind`: `evidence` or `avatar`; `contentType`: `image/jpeg`, `image/png`, or `image/webp`; `sizeBytes` ≤ **1,048,576**.
- The returned `path` is `{userId}/{random}.{ext}`; the client uploads directly to `uploadUrl` with `token`.
- Attach validates: caller ownership of the path prefix, object existence, actual size ≤ 1 MiB, allowed content type.
- Evidence stays in the private `evidence` bucket. Avatars are public-read; the client builds `{SUPABASE_URL}/storage/v1/object/public/avatars/{path}`.
- Compression and EXIF stripping are client-side; see `docs/engineering/media-pipeline.md`.

### 3.5 Geocoding

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| GET | `/api/v1/geocode/reverse?lat=&lon=` | Auth | Resolve a pin coordinate to a human-readable address via OSM Nominatim | **P5 addendum** |
| GET | `/api/v1/tiles/{z}/{x}/{y}.png` | Public | Raster tile proxy: OSM with `User-Agent: CivicApp/2.0`, OSM France/HOT fallback, cache headers | **P9 done** |

- Returns `{displayName, address, lat, lon, attribution: "© OpenStreetMap contributors"}`.
- Server-side proxy only: 1 upstream request/second, in-memory LRU cache (coords rounded to ~1 m), 8 s timeout.
- `GEOCODER_USER_AGENT` must include a real contact URL/email before production per the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- **The returned `ward` text is not authoritative.** Derive the ward with `GET /areas/at` (PostGIS `ST_Covers` against `ghmc_wards.kml`).
- Requires auth to prevent abuse of the free upstream service.
- Forward geocoding (text → coordinates/place search) is not implemented; Nominatim `/search` can be added behind the same proxy if needed.

### 3.6 Users, preferences, activity

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| GET | `/api/v1/users/me` | Auth | Profile (lazily created from the JWT `sub`) | **P2 done** |
| PATCH | `/api/v1/users/me` | Auth | Update profile fields | **P2 done** |
| DELETE | `/api/v1/users/me` | Auth | Delete account: anonymize profile, remove personal artifacts, retain anonymous civic reports | **P9 done** |
| GET | `/api/v1/users/me/preferences` | Auth | Read preferences (lazily created) | **P2 done** |
| PUT | `/api/v1/users/me/preferences` | Auth | Update preferences (supplied fields only) | **P2 done** |
| PATCH | `/api/v1/users/me/preferences` | Auth | Partial preference update | **P2 done** |
| GET | `/api/v1/users/me/activity?tab=submitted\|confirmed\|resolved\|tracked` | Auth | Personal civic activity (paginated `IssuePage`) | **P6 done** |
| GET | `/api/v1/users/me/audits` | Auth | Authored issues + computed KPI totals | **P6 done** |
| GET | `/api/v1/users/me/impact` | Auth | Civic impact metrics/sector savings | **P6 done** |
| GET | `/api/v1/users/me/favorites` | Auth | Favorite places | **P6 done** |
| POST | `/api/v1/users/me/favorites` | Auth | Add favorite (`label`, optional `areaId`/`coordinates`, `pinned`) | **P6 done** |
| PATCH | `/api/v1/users/me/favorites/{id}` | Auth | Pin/label | **P6 done** |
| DELETE | `/api/v1/users/me/favorites/{id}` | Auth | Remove | **P6 done** |
| GET | `/api/v1/users/me/export?format=geojson\|csv\|json` | Auth | Personal audit export | **P6 done** |
| GET | `/api/v1/users/{handle}` | Public | Public profile (non-anonymous data) | P3 |

**Activity derivation (implemented):**
- `submitted`: `author_id = me`
- `confirmed`: `issue_confirmations.user_id = me`
- `resolved`: issues the user authored or confirmed that are resolved. (Fixes the current UI bug that shows all resolved issues.)
- `tracked`: issues the user voted on OR confirmed. No bookmark table is needed.

All tabs return the standard paginated `IssuePage`, newest first, personalized with `userVote`/`userConfirmed`.

**Audits:** authored issues plus `kpis: {totalLogged, reported, underReview, inProgress, verified}`; `verified` counts resolved issues.

**Impact:** computed from distinct resolved issues authored or confirmed by the user, valued with `categories.avoided_cost_inr`; returns `totalValueInr`, `verifiedCount`, `sectorBreakdown[]`. Values are **derived**, not the static UI numbers. A user who both authored and confirmed an issue is counted once.

**Favorites:** `areaId` (GHMC ward) and/or `coordinates` are optional; `label` is required. `(user, area)` is unique (409 on duplicate); unknown area returns 422. Responses include `area`, `zone`, and `circle`. Ownership is enforced; another user's favorite returns 404.

**Export:** returns `text/csv`, `application/geo+json`, or `application/json` with `Content-Disposition: attachment`, scoped to issues authored by the caller. The caller's own exact coordinates are included (from the private location table) because the response is auth-scoped to the author; no other user's records are included. The client must download/share the response; the current UI does not.

### 3.5 Media

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| POST | `/api/v1/media/upload-url` | Auth | Signed upload URL for evidence/avatar | P1 |
| GET | `/api/v1/media/{id}/url` | Auth/owner | Refresh signed download URL | P2 |
| DELETE | `/api/v1/media/{id}` | Auth/owner | Delete unreferenced object | P3 |

Upload request: `{purpose:"issue_evidence"|"avatar"|"resolution", contentType:"image/jpeg"|"image/png"|"image/webp", contentLength}`. Response: `{uploadUrl, token, path, expiresAt, maxBytes}`.

Server enforces: MIME whitelist; JPEG/PNG/WebP; ≤ 12 MB (bucket limit; align with client compression); path prefix per user; no arbitrary overwrite.

### 3.6 Notices, wards, tools (admin/official)

| Method | Path | Auth | Purpose | Phase |
|---|---|---|---|---|
| POST | `/api/v1/issues/{id}/status` | Official/Admin | Forward-only status advance + timeline event + audit row | **P7 done** |
| POST | `/api/v1/issues/{id}/resolution-image` | Official/Admin | Attach validated resolution evidence (issue must be resolved) | **P7 done** |
| GET | `/api/v1/issues/{id}/resolution-image-url` | Auth | Short-lived signed resolution-evidence URL | **P7 done** |
| POST | `/api/v1/assets/{id}/inspections` | Official/Admin | Record inspection, photos, severity/status | **deferred with assets (B-3)** |
| POST | `/api/v1/sla-escalations` | Auth | File SLA escalation (`serviceStandardId`, optional `issueId`, `note`); queued by default | **P6 done** |
| — | Deferred | — | Ward docket roster/meetings require a separately verified source | P4+ |
| POST | `/api/v1/ward-meetings/{id}/rsvp` | Auth | RSVP | P4 |
| GET | `/api/v1/admin/reports` | Admin | Moderation queue; includes author identity and logs `moderation.view` | **P7 done** |
| PATCH | `/api/v1/admin/reports/{id}` | Admin | Hide/unhide an issue (`{hidden, reason?}`) | **P7 done** |
| PATCH | `/api/v1/admin/comments/{id}` | Admin | Soft-delete/restore a comment (`{hidden}`) | **P7 done** |
| GET | `/api/v1/admin/audit-log` | Admin | Privileged-action log (paginated) | **P7 done** |
| PATCH | `/api/v1/admin/users/{id}/role` | Admin | Role assignment; self-change rejected (422) | **P7 done** |
| POST/PATCH/DELETE | `/api/v1/admin/notices` | Admin | Notice management (duplicate ID → 409) | **P7 done** |
| POST | `/api/v1/admin/assets` | Admin | Asset import/maintenance | **deferred with assets (B-3)** |

**Moderation semantics:** hidden issues return 404 on every public/citizen surface (feed, detail, comments, votes, confirms, evidence, activity, audits, impact, export); admins see them in `/admin/reports`. Hidden comments remain in the thread as `[deleted]` so replies keep their parent. Status transitions are forward-only; officials and admins are both logged in `admin_audit_log`. Report creation is limited to 10/hour per user per process (429).

## 4. Frontend → backend mapping

| Frontend surface | Current data source | Backend interface | Tables | Phase |
|---|---|---|---|---|
| Home area header/picker | `LOCALITIES` (demo) | `GET /areas?q=`, `GET /areas/at` | areas | P1.5 |
| Home notices + modal | `MUNICIPAL_NOTICES` | `GET /notices` | notices | P1 |
| Home area widgets | mock issues, hardcoded coords | `GET /issues?areaId=`, `GET /areas/{id}` | issues, areas | P1/P1.5 |
| Camera capture | local photo | `POST /media/upload-url` | — | P1 |
| Create issue | `addIssue` in memory | `POST /issues` | issues, events, votes | P1 |
| Category grid/feed | `CATEGORIES_DATA`, mock issues | `GET /categories`, `GET /issues?categoryId=&sortBy=` | categories, checkpoints, issues | P1 |
| Issue detail | in-memory issue | `GET /issues/{id}`, `GET /issues/{id}/comments` | issues, events, comments | P1 |
| Vote / witness | in-memory toggles | `POST /issues/{id}/vote`, `/confirm` | issue_votes, issue_confirmations | P1 |
| Comments/replies | in-memory | `POST /issues/{id}/comments`, `POST /comments/{id}/vote` | comments, comment_votes | P1 |
| Personal activity | derived in memory | `GET /users/me/activity?tab=` | issues, votes, confirmations | P2 |
| Profile / edit profile | demo user | `GET/PATCH /users/me`, `POST /users/me/avatar*` | profiles, storage | P1 |
| Settings toggles | in-memory | `PUT/PATCH /users/me/preferences` | user_preferences | P1 |
| Data export | fake alert | `GET /users/me/export` | issues, events | P2 |
| My Audits / Impact | static | `GET /users/me/audits`, `/impact` | issues, categories | P2 |
| Favorite Places | local state | `GET/POST/PATCH/DELETE /users/me/favorites` | favorite_places | P2 |
| GeoMap areas/assets | hardcoded 7 wards/16 assets (Bengaluru/Delhi/Mumbai) | `GET /areas`, `/areas/{id}/assets`, `/assets/{id}` | areas, assets, inspections | P3 |
| SLA charter/escalate | static/alert | `GET /service-standards`, `POST /sla-escalations` | service_standards, sla_escalations | P3 |
| Ward docket/RSVP | static/alert | Deferred until current municipal boundaries are verified | ward_officials, ward_meetings, rsvps | P4+ |
| RTI toolkit | static/alert | Deferred | — | P4+ |
| DigiLocker | hardcoded | Deferred (OAuth onboarding) | profiles.digilocker_verified | P4+ |
| Push notifications | none | Deferred | push_tokens | P4+ |

## 5. External integrations

| Integration | Direction | Current state | Production plan |
|---|---|---|---|
| Supabase Auth | Client → Supabase | Absent | Email OTP first; phone OTP after DLT/provider setup |
| Supabase Storage | Client ↔ Supabase | Absent | Private evidence bucket, public/private avatars, signed URLs |
| Map tiles | Client → FastAPI → OSM/OSM France/HOT | Backend proxy sends `User-Agent: CivicApp/2.0`, detects OSM blocks, falls back to OSM France/HOT, caches, and returns `X-Tile-Provider` | Development/demo only. OSM policy restricts app-scale use; for production use an approved/commercial provider or self-host, or set `EXPO_PUBLIC_TILE_URL` |
| Unsplash demo images | Client → Unsplash | Hardcoded | Remove before release; replace with resolved evidence |
| Camera / image picker | Client → OS | Real | Keep; add compression + EXIF stripping |
| DigiLocker | Not integrated | Hardcoded badge | Defer; requires partner onboarding |
| GHMC/HMWSSB/TSSPDCL | Not integrated | Static notices | Defer; no public APIs identified |
| OTP SMS provider | Supabase → provider | Not configured | TextLocal/MSG91/Twilio via Send SMS Hook; DLT registration |

## 6. Events, webhooks, realtime

- No webhooks are required for MVP.
- No realtime channels are required; the client currently has no subscription model. Add Supabase Realtime later only if live vote/comment updates become a requirement.
- Supabase Auth may call an optional Send SMS Hook for India; treat it as an external integration, not an application webhook.
