# Security Catalog

> Status: **partially implemented (Phases 2–7)**. FastAPI verifies Supabase JWTs via JWKS, exposes only the caller's own profile/preferences, enforces anonymous public projections and private exact coordinates, gates official/admin actions, and logs privileged mutations plus moderation views. The Expo client still has no real auth; RLS policies and geometric masking do not exist yet. Remaining items are marked proposed.

## 1. Trust boundaries

| Boundary | Untrusted side | Trusted side | Controls |
|---|---|---|---|
| Client ↔ Supabase Auth | Expo app | Supabase Auth | OTP, rate limits, provider verification, JWT signing |
| Client ↔ FastAPI | Expo app | FastAPI | Bearer JWT verified via JWKS; server-derived identity; input validation |
| Client ↔ Storage | Expo app | Supabase Storage | Short-lived signed upload/download URLs; bucket MIME/size limits; path ownership |
| FastAPI ↔ Postgres | Vercel function | Supabase Postgres | Private credentials; parameterized ORM queries; least-privilege role |
| Server ↔ OSM | Server/client | Third party | No secrets; attribution/usage policy |
| Server ↔ OSM Nominatim | Backend | Third party | Coordinates are disclosed; 1 req/s; cache; contact User-Agent; auth required; attribution |

## 2. Authentication

- Provider: **Supabase Auth**.
- Methods: **email + password** in the current build (ADR-011, 2026-11-09), per owner direction while SMTP/OTP setup is deferred. Email OTP and phone OTP remain deferred; phone OTP also requires an SMS provider and TRAI DLT registration.
- Passwords are handled entirely by Supabase Auth (hashing, rate limits). The Argus backend and app never store passwords.
- Current build disables **Confirm email** for immediate signup. This must be revisited before production (email verification + password reset need SMTP).
- OTP: set length explicitly to **6 digits**; align the client input. SMS supports 6–10 digits; the current 4-digit UI is incompatible.
- Tokens: access + refresh tokens. Client stores them with `expo-secure-store` (not AsyncStorage in plaintext).
- Verification in FastAPI:
  - Fetch JWKS from `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`.
  - Use `PyJWKClient` with caching; select the key by `kid`.
  - Allow only the configured algorithms (prefer ES256/RS256).
  - Validate `exp`, `sub`, `aud = authenticated`, and `iss = https://<project>.supabase.co/auth/v1`.
  - Do not accept unverified `alg` from the token; derive allowed algorithms from configuration.
  - Do not verify HS256 with a shared secret unless the project is explicitly on legacy symmetric keys; Supabase recommends asymmetric keys.
- Identity mapping: JWT `sub` → `profiles.id`. Lazily create the profile and preferences on first successful request; a Supabase trigger is optional but not required. **Implemented** in `app/core/security.py`; `profiles.id` has no local FK to `auth.users` because that table exists only in Supabase.
- Missing, malformed, forged, expired, wrong-audience, and wrong-issuer tokens all return 401 with `WWW-Authenticate: Bearer` (covered by tests).
- Demo accounts: **must not exist in production**. If retained for staging, gate them behind `ENVIRONMENT=development` and a server-side flag; never accept a client-supplied user object as identity.
- Sign-out: revoke the Supabase session; do not rely on clearing local state alone.

## 3. Authorization

| Role | Capabilities |
|---|---|
| `citizen` | Read public data; create issues/comments; vote/confirm; edit own profile/preferences; manage own favorites; export own data |
| `official` | Citizen capabilities + advance issue status, attach resolution evidence, record asset inspections |
| `admin` | All + moderation, notice CRUD, role assignment, asset maintenance |

Enforcement:

- FastAPI dependencies (`require_official`, `require_admin`) check `profiles.role`; implemented in `app/api/deps.py`. Citizens receive 403; unauthenticated callers 401.
- **Implemented (Phase 7):** forward-only status advancement, resolution evidence, moderation queue/hide, notice CRUD, role assignment, and report rate limiting. Self-role changes are rejected to avoid admin lockout. Hidden issues are treated as absent on all citizen surfaces.
- Every mutation verifies ownership (`author_id = current_user.id`) unless the role permits.
- Anonymous issues still have a stored `author_id` for moderation; public serializers never expose it.
- **RLS is enabled on all 17 application tables** (migration `f127b8b90639`) with no permissive policies. The backend uses the owner/service role and bypasses RLS; direct `anon`/`authenticated` access through Supabase's Data API is denied. Verify with `python -m scripts.check_rls`. If read-only PostgREST access is later desired, add explicit, tested policies.

## 4. Anonymity and pseudonymity

The documentation calls the feature "zero-knowledge." The code only changes the displayed author to "Anonymous Citizen." The backend must not overclaim.

Accepted semantics (B-4 resolved 2026-11-08, ADR-007): **server-side pseudonymity.** Store `author_id`; hide it from all public responses. Moderators can access it for abuse handling. This is not unlinkable anonymity.

- `pseudonymous_mode` in preferences hides the public handle on otherwise attributed reports. `is_anonymous` on a report hides the author entirely. *Phase 3 implements `is_anonymous`; `pseudonymous_mode` projection is deferred.*
- **Implemented:** public issue/comment payloads return `Anonymous Citizen` when anonymous and never include `author_id`, email, phone, or exact coordinates. Tests assert the absence of these fields.
- Never include `author_id`, email, phone, or exact coordinates in public payloads, logs, or error messages.
- Avoid logging request bodies containing coordinates or contact data.

## 5. Location privacy

- Store the exact coordinate in `issue_private_locations`, never in the public issue payload.
- Expose `issues.geom` only (possibly masked).
- Masking: if the user's `home_radius_masking` is enabled and the report is within their configured radius of `home_geom`, replace the public geom with a random point between 0.5×R and R from the true point. Do not expose the offset or the home anchor.
- Record `is_geom_masked`. *Deferred: `profiles.home_geom` and client home capture do not exist yet; Phase 3 always stores `is_geom_masked=false`.*
- Witness coordinates are stored with the confirmation and used only for distance validation; do not publish them. **Implemented.**
- The current client captures **no coordinates**, so masking is inert until GPS is added.

## 6. Media security

**Implemented (Phase 4), live on Supabase project `ndcmhjdssxnhjlovxyaj`:**

- Buckets: `evidence` (private) and `avatars` (public read). Both have `file_size_limit = 1,048,576` and `allowed_mime_types = {image/jpeg,image/png,image/webp}`.
- Upload: server-issued signed upload URL; path is `{auth.uid()}/{random}.{ext}`; Storage RLS requires the first folder to equal `auth.uid()`. SVG/HTML and other types are rejected by the API and the bucket.
- The API rejects declared sizes > 1 MiB and re-checks the actual object size/content type on attach. A lying client cannot attach an oversized object.
- Download: short-lived signed URLs for private evidence (1 hour default). Avatars use the public bucket URL only.
- Backend signing uses the caller's token (RLS-scoped) unless a service-role key is configured server-side. The service-role key must never reach the app.
- EXIF: strip client-side with `expo-image-manipulator` before upload; the client compression pass re-encodes the image (which removes EXIF). Server-side re-encoding is not done on Vercel.
- Image quality target: **visually lossless**, not bit-identical; see `docs/engineering/media-pipeline.md` for the exact ladder.

**Implemented (Phase 7):**

- Resolution evidence uses the same private `evidence` bucket and validation (caller-owned path, existence, ≤1 MiB, JPEG/PNG/WebP). Only officials/admins can attach it, and only after the issue is resolved. `GET /issues/{id}/resolution-image-url` issues a short-lived signed read.

**Still proposed:**

- Orphan cleanup: delete unreferenced uploads after a grace period via a scheduled job.

## 6.1 Reverse geocoding (OSM Nominatim)

- `GET /geocode/reverse` is a **server-side proxy** requiring auth. Clients never call Nominatim directly.
- Only the pin/issue location is geocoded. Do not silently geocode the user's live device location; disclose third-party coordinate sharing in the privacy notice.
- Upstream controls: 1 request/second per process, LRU cache keyed by ~1 m coordinates, 8 s timeout, identifying `User-Agent`.
- Attribution: `© OpenStreetMap contributors`.
- The address's ward text is **not** authoritative; always derive the area with `ST_Covers` against `ghmc_wards.kml`.
- Production blocker: `GEOCODER_USER_AGENT` must include a real contact URL/email per Nominatim policy; do not use the public endpoint for bulk/systematic queries.

## 7. Input and abuse controls

- Pydantic validation for every request: lengths, enum values, UUID formats, coordinate bounds.
- Unique constraints prevent duplicate votes/confirmations per user.
- Report creation quota: **implemented (Phase 7)** as 10 per user per hour, per process, returning 429. This is a soft control; move to Redis/WAF for multi-instance deployments (TD-B23).
- Comment length 1–500; depth ≤ 3; strip control characters.
- No HTML rendering of user content in API responses; the client renders plain text.
- Prevent self-vote inflation? The current app auto-upvotes the author. Accept one author vote; do not allow additional accounts to be trivially created without OTP.
- Official comments must set `is_official` server-side based on role, never from the client.
- File uploads cannot be proxied through Vercel (4.5 MB body limit); direct-to-storage prevents both body-limit bypass and server memory abuse.

## 8. Secrets and configuration

| Variable | Exposure |
|---|---|
| `DATABASE_URL` (Supavisor, 6543) | Server only |
| `SUPABASE_URL` | Public (client config) |
| `SUPABASE_ANON_KEY` / publishable key | Public (client config) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only**; never in Expo |
| `SUPABASE_JWT_AUD`, `SUPABASE_JWT_ISSUER` | Server |
| `EVIDENCE_BUCKET`, `AVATAR_BUCKET` | Server |
| `ENVIRONMENT`, `ALLOWED_ORIGINS` | Server |
| `SENTRY_DSN` (optional) | Server |

- Use Vercel environment variables per environment (development/preview/production).
- Never commit `.env`; `.gitignore` already excludes it.
- Rotate service-role keys if exposed.
- The Expo `EXPO_PUBLIC_*` variables must contain only public values (URL + anon key).

### Mobile credential boundary (Android-first)

- `EXPO_PUBLIC_*` values are compiled into the app bundle. Treat them as **public**.
- Allowed in the app:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key)
  - `EXPO_PUBLIC_API_URL`
- Never in the app:
  - Supabase service-role key
  - database URL/credentials
  - JWT signing secret
  - SMS/email provider credentials
  - Vercel tokens or other server secrets
- Privileged operations (moderation, status changes, signed upload URL issuance, elevated exports) run only in FastAPI.
- Production API: HTTPS only. Do not enable `usesCleartextTraffic` in release builds.
- Store build-time secrets in EAS secrets or the CI secret store. Never commit `.env`, keystores, `credentials.json`, or Play service-account JSON.
- Secret-scan the production bundle before release.
- Google Play's data safety declaration must accurately describe collected personal info, location, and photos, plus retention/sharing.

## 9. Data protection and retention

- Personal data: name, email, phone, address, home coordinates, precise report coordinates.
- Public data: handle, display name (unless pseudonymous), report text, public/masked coordinates, evidence images.
- Export endpoints return only the authenticated user's data.
- **Implemented (Phase 7):** moderation mutations and moderation-queue views (which expose anonymous authorship) are logged in `admin_audit_log`. Exact coordinates are not exposed to admins through any endpoint.
- **Implemented (Phase 9):** account deletion (`DELETE /users/me`) anonymizes identity, removes personal artifacts, and retains anonymous civic reports; retention periods and cleanup are documented in `docs/engineering/privacy-retention.md` and enforced by `scripts/retention_cleanup.py`. Legal review is still required.
- Backups inherit the same access controls; do not copy production data into preview environments.

## 10. Known security gaps in the current app

| Gap | Impact |
|---|---|
| Any 4-character OTP accepted | Zero authentication |
| App starts logged in as demo user | No auth gate |
| Client does not yet send a Supabase token | Phase 2 API is unreachable from the app until cut-over |
| Demo login bypasses verification | Account impersonation |
| `digilockerVerified` hardcoded | False trust signal |
| No session persistence | Users cannot stay signed in; encourages workarounds |
| No upload path | Evidence never leaves the device; no server-side validation |
| Geolocation is hardcoded | No provenance; masking claims are false |
| ~~No authorization roles~~ | **Resolved in Phase 7:** official/admin gates and audit logging |
| ~~No rate limiting~~ | **Resolved in Phase 7:** per-process report quota; shared/WAF limiting still proposed |
| ~~No authorization roles~~ | **Resolved in Phase 7** |
| ~~No RLS~~ | **Resolved in Phase 9:** RLS enabled on all application tables |
| ~~No account deletion~~ | **Resolved in Phase 9:** `DELETE /users/me` anonymizes and removes personal artifacts |
| Public OSM tiles with custom User-Agent | Potential tile-policy violation; no attribution |
| Static crypto hash/Aadhaar preview in Settings | Misleading security claims; remove in production |

## 11. Security acceptance criteria

- Invalid/expired/forged JWTs return 401; no endpoint trusts a client-supplied user id.
- Anonymous issue payloads never include author identifiers.
- Exact coordinates are absent from every public response and log.
- Upload URLs cannot write outside the caller's path prefix or exceed the bucket limits.
- Votes/confirmations are unique per user; duplicate requests are idempotent.
- Official-only endpoints reject citizens with 403.
- RLS tests prove direct Data API access cannot mutate application tables.
- Secrets scan and dependency audit run in CI.
