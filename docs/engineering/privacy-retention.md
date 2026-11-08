# Privacy and Data Retention

> Status: **implemented backend controls + documented policy (2026-11-08).** This is an engineering policy, not legal advice. Have counsel review before Play Store release.

## 1. Data inventory

| Data | Storage | Public? | Purpose |
|---|---|---|---|
| Supabase user id, email, phone | Supabase Auth + `profiles` mirror | No | Sign-in and account identity (current build uses email + password; passwords are hashed by Supabase and never stored by Argus) |
| Handle, display name, avatar, area/city/state/pincode | `profiles` | Handle/display name/avatar appear on non-anonymous reports; contact fields are not public | Citizen profile |
| Preferences (privacy, notifications, language, lock) | `user_preferences` | No | Settings |
| Issue title, description, location text, category, status, timeline | `issues`, `issue_events` | Yes | Civic report |
| Exact issue coordinates | `issue_private_locations` | **Never** | Ward derivation and civic verification |
| Public issue geometry | `issues.geom` | Not serialized today; reserved for a future map | Spatial queries |
| Evidence photos | Supabase `evidence` bucket (private) | Only through short-lived signed URLs to authenticated users | Proof |
| Avatars | Supabase `avatars` bucket (public) | Yes | Profile |
| Votes, confirmations | `issue_votes`, `issue_confirmations` | Counts are public; identities are not | Prioritization / witnessing |
| Comments | `comments`, `comment_votes` | Yes, with anonymous masking | Discussion |
| Favorites | `favorite_places` | No | Monitoring |
| SLA escalations | `sla_escalations` | No | Citizen Charter |
| Privileged actions | `admin_audit_log` | No (admin-only) | Accountability |
| Reverse-geocoded pin address | Not stored by the API | — | Display only |

## 2. Retention policy

| Data | Retention | Enforcement |
|---|---|---|
| Profile and contact fields | Until account deletion | `DELETE /api/v1/users/me` |
| Preferences, favorites, SLA escalations, votes, confirmations | Until account deletion | Deleted on `DELETE /users/me` |
| Issue text/status/timeline | Life of the civic record | Retained after account deletion, anonymized |
| Exact coordinates | Life of the civic record | Never public; deleted with the issue |
| Evidence photos | Life of the civic record | Private bucket; orphan cleanup is deferred (TD-B17) |
| Comments | Life of the thread | Anonymized on account deletion |
| Soft-deleted comment text | Overwritten after **30 days** | `python -m scripts.retention_cleanup --apply` |
| Admin audit log | **24 months** | `python -m scripts.retention_cleanup --apply` |
| Supabase Auth user | Supabase-managed | Not deleted by the app endpoint; delete via Supabase dashboard/Admin API when required |
| Backups/PITR | Supabase plan policy | Configure before release |

`scripts/retention_cleanup.py` defaults to a dry run. Run it on a schedule (Vercel Cron or a Supabase scheduled function) after deployment.

## 3. Account deletion

`DELETE /api/v1/users/me` (authenticated, irreversible):

1. Deletes favorites, SLA escalations, issue votes, confirmations, comment votes, and preferences.
2. Anonymizes the profile: handle becomes `deleted_<id>`, display name `Deleted Citizen`, email/phone/address/area/city/state/pincode cleared, avatar reset, DigiLocker flag cleared.
3. Sets `profiles.deleted_at`; subsequent API calls with the same token return **403**.
4. Marks the user's issues and comments `is_anonymous=true`, preserving the civic record and thread structure.
5. Writes a `user.delete` row to `admin_audit_log`.

The app exposes this under **Settings → Data, Storage & Trust → Delete My Account**. Deleting the Supabase Auth user itself remains an operator action.

## 4. Export

`GET /api/v1/users/me/export?format=json|csv|geojson` returns only issues authored by the caller, including their own exact coordinates. The app downloads/shares the file via Settings → Export My Data.

## 5. Database access control (RLS)

Migration `f127b8b90639` enables **Row Level Security** on every application table with no permissive policies. FastAPI connects with the owner/service role (RLS bypass); Supabase's `anon`/`authenticated` Data API roles get no access. Verify with:

```bash
cd backend
python -m scripts.check_rls
```

RLS is defense-in-depth; FastAPI authorization remains the primary control.

## 6. Evidence and EXIF

- The app re-encodes every photo with `expo-image-manipulator` before upload, which strips EXIF (including GPS) and compresses to ≤ 1 MiB.
- The API re-validates path ownership, object existence, size, and MIME on attach.
- Evidence is private; reads use short-lived signed URLs.

## 7. Third parties

| Party | Data shared | Notes |
|---|---|---|
| Supabase | All application data, Auth, Storage | Region `ap-southeast-1`; configure backups/PITR |
| Map tile provider | Approximate map viewport | Development: FastAPI proxy → OSM/OSM France/HOT with `User-Agent: CivicApp/2.0`, caching, attribution. Production: approved/licensed provider or self-host |
| OSM Nominatim | Pin coordinates | Reverse geocoding only; server-side proxy with 1 req/s and cache |
| Municipal systems | None yet | No integrations in the MVP |

### Why Nominatim needs a contact User-Agent

The OSM Foundation's [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) requires every client to identify the application and provide a way to contact its operator (an `HTTP_USER_AGENT` or `Referer` with a real URL/email). It is an identifier, **not a secret**. Without it, the public instance may throttle or block the backend, and heavy or systematic use can be banned. The owner has deferred this for now; the placeholder `ArgusPanoptes/0.1` is development-only. Before production, set `GEOCODER_USER_AGENT=ArgusPanoptes/0.1 (contact@your-domain)` and keep the existing throttle/cache.

## 8. Open privacy items

| Item | Status |
|---|---|
| Public geometric masking (`home_radius_masking`) | Deferred: no home anchor is captured (R-06) |
| Automated evidence/orphan retention | Deferred (TD-B17) |
| Supabase Auth user deletion | Operator action; not automated |
| Privacy policy page and Play data-safety form | Not written (release blocker) |
| Legal review of this policy | Pending |
| Nominatim production contact | Deferred by owner |
