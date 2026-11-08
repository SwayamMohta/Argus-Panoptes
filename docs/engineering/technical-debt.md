# Technical Debt

> Scope: frontend prototype gaps and deliberate backend deferrals. Priorities reflect impact on the backend build and launch, not code style.

## 1. Frontend debt (blocks or distorts backend work)

| ID | Debt | Impact | Remediation | Priority |
|---|---|---|---|---|
| TD-01 | No API client, persistence, or session; all state resets on reload | Backend cannot be consumed; users lose data | **Resolved in Phase 9:** Supabase client + SecureStore session + API client | Critical |
| TD-02 | Auth accepts any 4 characters; demo login bypasses verification; app starts logged in | No real identity; security and privacy claims are false | **Resolved in Phase 9:** 6-digit email OTP; demo accounts/auto-login removed | Critical |
| TD-03 | No geolocation; "GPS" is hardcoded; reports/confirmations have no coordinates | Create/confirm now require coordinates, so the client cannot call those endpoints until fixed; no provenance, masking, or proximity | **Resolved in Phase 9:** `expo-location`; coordinates mandatory at create/confirm | Critical |
| TD-04 | Geography is inconsistent: Home uses Hyderabad, GeoMap uses Bengaluru/Delhi/Mumbai, demo profiles use Bengaluru, Ward Docket uses Hyderabad | Schema/seeds and UX contradict each other | **Resolved scope:** Hyderabad only (ADR-006). GeoMap is API-driven; Bengaluru demo accounts removed; Ward Docket remains static until verified data exists | Critical |
| TD-05 | Issues have only free-text `location`; no area/coordinates; Home filters by substring | Unreliable area feeds and aggregate metrics | **Resolved in Phase 9:** coordinates + PostGIS area derivation; feeds filter by `areaId` | High |
| TD-06 | No media upload; photos are local URIs/data URLs; capture failure falls back to Unsplash | Evidence is not durable or verifiable | **Resolved in Phase 9:** signed direct upload + compression/EXIF strip (≤1 MiB) | High |
| TD-07 | Export is a timer + alert; cache clear and DigiLocker refresh are alerts | Misleading features; no real open data | **Export resolved in Phase 9** (real file download/share). Cache/DigiLocker remain cosmetic | High |
| TD-08 | Profile subpages are static (audits, impact, favorites, SLAs, docket) | Backend endpoints have no real consumer contract | **Audits/impact/favorites/SLA resolved in Phase 9.** Docket/RTI remain static until backend data exists | High |
| TD-09 | Settings sub-state (GPS radius, lock timeout, channels, auto-clear) resets on navigation | Preferences appear broken | **Resolved in Phase 9:** persisted via `user_preferences` | High |
| TD-10 | Nested reply to a reply is silently dropped while `commentsCount` increments | Data loss and incorrect counts | **Resolved in Phase 9:** server-threaded comments with depth ≤3 | Medium |
| TD-11 | `CreateIssueScreen` fallback references `CATEGORIES_DATA` without importing it | Runtime crash if category prop omitted | **Resolved in Phase 9:** safe fallback category | Medium |
| TD-12 | `MediaModal` is mounted but unreachable; avatar logic duplicated in EditProfile | Dead code and divergent behaviour | Remove or wire one path | Medium |
| TD-13 | `resolvedImage`/`afterImage` never exist in mock data; before/after toggle is dead | Feature appears available but never renders | Add fields after resolution flow exists | Medium |
| TD-14 | "Tracked" means confirmed OR upvoted; no explicit bookmark | Ambiguous product semantics; backend mapping unclear | **Resolved in Phase 6:** tracked = voted OR confirmed, derived server-side; no bookmark table. Wire the client tab to `/users/me/activity?tab=tracked` | Medium |
| TD-15 | Notification settings and channels are inert; no push | False expectations | Implement push later or label as coming soon | Medium |
| TD-16 | App lock/biometrics configured but not enforced | False security signal | Implement or remove | Medium |
| TD-17 | Language selector stores a label, no i18n engine | No localization despite 5-language claim | Add i18n or remove the claim | Low |
| TD-18 | `WardNeedsAttention`, `NearbyIssuesSection`, `NearbyIssueCard`, `MunicipalNoticeSection`, `CommunityConfirmationControl` are unused | Dead code and an unreachable witness feature | Integrate or delete | Low |
| TD-19 | Pull-to-refresh is a timer; no loading/error/empty-state discipline for network calls | Poor UX after cut-over | Add request states when wiring | Low |
| TD-20 | No frontend tests, lint, or Node version enforcement | Regressions and unsupported Node versions | Add minimal tests, config, `.nvmrc`/engines | Medium |

## 2. Documentation debt

| ID | Debt | Impact | Remediation |
|---|---|---|---|
| TD-D1 | README says Node 18/20; Expo 58 requires 22.13+/24.3+/26+ | Setup failures | Correct README |
| TD-D2 | `CONTEXT.md` claims 150+ wards, GPS capture, EXIF, zero-knowledge, push, etc. | Design decisions based on false capabilities | Add a "prototype vs target" note or rewrite |
| TD-D3 | `documentation.md` specifies FastAPI-style auth endpoints that are replaced by Supabase Auth | Duplicate/conflicting API contracts | Mark superseded; point to this folder |
| TD-D4 | `documentation.md` lists endpoints/tables not aligned with actual fields (no localityId, no coordinates, 3-level comments) | Implementation confusion | Reconcile with the data/interface catalogs |
| TD-D5 | `frontend/package-lock.json` contains unused testing-library root deps | Misleading dependency state | Regenerate the lockfile |

## 3. Deliberate backend deferrals (not defects)

| ID | Deferral | Reason | Revisit when |
|---|---|---|---|
| TD-B1 | No Redis/cache | No caching bottleneck yet | Read volume or ranking cost justifies it |
| TD-B2 | No Celery/queues | No background workload in MVP | Orphan cleanup, exports, notifications need async work |
| TD-B3 | No push notifications | No client implementation | Mobile engagement is prioritized |
| TD-B4 | No DigiLocker OAuth | Partner onboarding and KYC requirements | Identity trust becomes a product requirement |
| TD-B5 | No RTI PDF generation | Client is stub/alert only | RTI output is requested |
| TD-B6 | No multi-city assets | Geography decision pending | B-1 resolved |
| TD-B7 | No realtime subscriptions | Polling/refresh is sufficient initially | Live engagement is required |
| TD-B8 | No offline queue | Complex conflict resolution | Field connectivity becomes a proven problem |
| TD-B9 | Offset pagination, not keyset | Simpler and matches client | Deep pagination/performance degrades |
| TD-B10 | Counter columns instead of materialized views | Simpler and transactional | Analytics/reporting grows |
| TD-B11 | ~~`image_path` accepted from the client without ownership/bucket validation~~ **Closed in Phase 4** | Attach endpoints validate prefix, existence, size, and type; create no longer accepts image paths | — |
| TD-B12 | Public geometric masking (`home_radius_masking`) is inert | `profiles.home_geom` and client home capture do not exist | Home location is captured |
| TD-B13 | `pseudonymous_mode` preference does not alter public projection yet | `is_anonymous` already hides authors; preference semantics need product confirmation | Frontend cut-over / privacy review |
| TD-B14 | Comment thread loads ≤1000 rows per issue and paginates roots in Python | Simple and correct for MVP volumes | Threads grow beyond the cap |
| TD-B15 | Trending expression index not created | B-tree/GiST indexes cover current filters; no measured need | Feed latency degrades on seeded data |
| TD-B16 | Client image compression/EXIF stripping not implemented yet | Frontend dependencies are not installed; on-device validation belongs to the cut-over | Phase 9 — follow `docs/engineering/media-pipeline.md` |
| TD-B17 | Orphaned evidence uploads are not cleaned up | No scheduled job yet | Object storage grows with abandoned uploads |
| TD-B18 | No backend assets/asset inspections | The only map asset data in the repo is Bengaluru/Delhi/Mumbai; seeding it would violate Hyderabad-only/no-fabrication | A verified Hyderabad asset dataset is supplied |
| TD-B19 | No localities/landmarks table | Only unverified static locality constants exist; zones/circles/landmarks are not in the verified ward dataset | A verified locality/landmark source is supplied |
| TD-B20 | Map pin UI + reverse-geocode wiring not implemented | GeoMap has no tap-to-pin flow; the app also has no auth token yet | Phase 9 frontend cut-over |
| TD-B21 | Nominatim User-Agent lacks a contact URL/email | Public policy requires application identification and a contact; per-process throttle and cache are in place. **Owner deferred this** | Before production; set `GEOCODER_USER_AGENT` with a real contact |
| TD-B22 | User export builds the full JSON/CSV/GeoJSON response in memory | Simple and correct for MVP record counts; no streaming or row cap | A user's authored records or evidence metadata grow large enough to pressure memory/timeouts |
| TD-B23 | Report rate limiting is per-process, in memory (10/hour) | Correct for one instance; resets on deploy and does not coordinate across Vercel instances | Multiple API instances or a stricter shared quota is required (Redis/WAF) |
| TD-B24 | Asset inspections are not implemented | `POST /assets/{id}/inspections` is blocked with assets (B-3); no verified Hyderabad dataset | A verified asset dataset exists |
| TD-B25 | Moderation hides issues from the author's own activity/export | Moderated content is withheld from all citizen surfaces; the author retains no in-app view until restored | Moderation policy requires an author-visible appeal/view path |
| TD-B26 | CI is configured but has never run on GitHub Actions | Local checks pass, but the workflow's service container, dependency install, and gitleaks job are unverified | The repository is pushed and the first CI run is green |
| ~TD-B27~ | **Resolved in Phase 9:** RLS enabled on all application tables; `scripts/check_rls.py` verifies. FastAPI authorization remains the primary control | — | — |
| TD-B28 | No admin/official UI | Backend APIs exist (status, moderation, notices, roles, audit); the owner deferred the UI | A moderator/official surface is required |
| TD-B29 | KML licence wording is not recorded | The owner confirmed open use; exact attribution text is pending | Before public release |
| TD-B30 | `npm audit` reports 7 moderate `minimatch` DoS advisories in Expo build tooling | Affects build-time globbing, not the shipped app bundle; the offered fix downgrades Expo to 57 (breaking) | Re-evaluate after an Expo SDK update or an upstream patch |
| TD-B31 | Admin/official UI deferred by the owner | Backend APIs are ready; operations currently require API calls/SQL | Post-MVP when a staff surface is required |
| TD-B32 | Map tiles use a FastAPI proxy to OSM/OSM France/HOT (in-process LRU) | Development/demo only. OSM policy restricts app-scale use; the proxy cache is per-process and not shared across Vercel instances | Before release, get OSMF approval, use a licensed provider, or self-host; use a shared/CDN cache |
| TD-B33 | Password reset and email verification are not implemented | Current build disables email confirmation for immediate signup; users who forget a password cannot recover it, and emails are unverified | Configure SMTP and implement reset/verification before production (or return to OTP) |

## 4. Debt acceptance rule

Do not let TD-01…TD-06 remain open when declaring the backend live. They are prerequisites for a truthful, functional integration. Later items can ship as documented limitations.
