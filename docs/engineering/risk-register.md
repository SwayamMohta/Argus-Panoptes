# Risk Register

> Status values: `open` · `mitigating` · `accepted` · `closed`.
> Likelihood/impact: low · medium · high.

## 1. Decisions required before implementation

| ID | Decision | Options | Recommendation | Why it blocks |
|---|---|---|---|---|
| B-1 | Geography scope | (a) GHMC Hyderabad only, (b) city-agnostic with Hyderabad seed, (c) multi-city now | **Resolved 2026-11-08:** Hyderabad only; sole dataset `wards_hyderabad.geojson` (ADR-009) | No longer blocks |
| B-2 | Auth channel | (a) email OTP, (b) phone OTP, (c) both | **(a) email OTP first**, phone OTP after DLT/provider | Changes UI, Supabase config, onboarding, cost, and launch date |
| B-3 | GeoMap assets in MVP | (a) backend-managed assets/inspections now, (b) static until later | **Resolved 2026-11-08: defer.** No verified Hyderabad asset dataset exists; the in-repo GeoMap assets are Bengaluru/Delhi/Mumbai. Ship wards from verified polygons; seed assets only from a real GHMC/audit source | Blocks asset UI only |
| B-4 | Anonymity semantics | (a) server-side pseudonymity with author stored, (b) unlinkable anonymity | **Resolved 2026-11-08: (a)** retain author for abuse/legal; hide publicly; do not call it zero-knowledge (ADR-007) | — |

## 2. Risks

| ID | Category | Risk | L | I | Mitigation | Status |
|---|---|---|---|---|---|---|
| R-01 | Delivery | SMS OTP in India requires TRAI DLT entity/header/template registration and a provider; approval can take days | High | High | Email OTP for MVP; start DLT onboarding early if phone auth is required | open |
| R-02 | Data | No GPS or coordinate provenance; reports and confirmations are text-only | High | High | Add `expo-location`; server validates bounds; do not claim verified location until then | open |
| R-03 | Architecture | Hyderabad/Bengaluru/Delhi/Mumbai geography conflict | High | High | Resolved by B-1/ADR-006: Hyderabad only; correct GeoMap in cut-over | closed |
| R-04 | Privacy | Evidence photos may contain faces, plates, homes, and EXIF GPS | High | High | Private bucket + 1 MiB limit + signed URLs done; client EXIF strip/compression pending Phase 9; retention policy still open | mitigating |
| R-05 | Security | Anonymous reports can be spam, defamatory, or abusive; no moderation UI | High | High | **Phase 7:** author retained, 10/hour report quota, admin queue with hide/soft-delete, and audit logging are implemented. A moderator UI and reporting/blocking remain open | mitigating |
| R-06 | Security | Exact coordinates are sensitive; a leak enables stalking/harassment | Medium | High | Separate private table; never serialize; masked public geom; review logs | open |
| R-07 | Reliability | Serverless DB connection exhaustion or prepared-statement errors | Medium | High | **Phase 8:** `NullPool`, `search_path=public,extensions`, and short transactions are implemented. Production Supavisor (6543) behavior is still unverified until deployment | mitigating |
| R-08 | Reliability | Vercel cold starts and 4.5 MB body limit degrade UX | Medium | Medium | Keep bundle lean; direct-to-storage uploads; client retries; health warm-up if needed | open |
| R-09 | Data | PostGIS in the `extensions` schema and Alembic search_path issues | Medium | Medium | Set search path explicitly; test migration on a Supabase branch | open |
| R-10 | Legal | Ward boundaries, docket data, and municipal notices may be unstructured/proprietary | High | Medium | `ghmc_wards.kml` adopted (ADR-010); **owner confirmed open use 2026-11-08**, retain the original and include GHMC attribution. Exact licence wording pending. Assets/notices remain unverified or deferred | mitigating |
| R-11 | Delivery | No admin/official portal or municipal integration exists | High | Medium | **Phase 7:** admin/official APIs exist (status, moderation, notices, roles, audit log). A separate moderator portal/UI and municipal integration remain open | mitigating |
| R-12 | Delivery | DigiLocker integration requires external onboarding and is currently faked | High | Medium | Remove the badge or label as unverified until integrated | open |
| R-13 | Privacy | Client is called "zero-knowledge" but stores identity server-side | High | High | Reword claims; document the actual threat model | open |
| R-14 | Compliance | Personal data (phone, email, address, coordinates) has no retention policy | Medium | High | **Phase 9:** account deletion, retention policy, and cleanup script are implemented (`privacy-retention.md`). Privacy notice/legal review remain open | mitigating |
| R-15 | Vendor | Supabase lock-in (Auth/Storage) | Medium | Medium | Postgres/Alembic portability; storage paths recorded in DB; keep auth abstraction thin | open |
| R-16 | Integration | OSM tiles: direct app use is blocked by the volunteer tile policy | Medium | Medium | **Phase 9:** tiles now go through a FastAPI proxy with `User-Agent: CivicApp/2.0`, OSM France/HOT fallback, and caching. This is development/demo only; OSM policy still restricts app-scale use, so production needs approval, a licensed provider, or self-hosting | mitigating |
| R-17 | Delivery | Frontend cut-over is not scoped as part of "backend" and may be underestimated | High | High | Treat Phase 9 as a separate workstream with its own acceptance criteria | open |
| R-18 | Data | Counter drift (votes/confirmations/comments) | Medium | Medium | Transactional updates + periodic recompute job | open |
| R-19 | Reliability | Timezone/date formatting mismatch (`timeAgo`, timeline `date` strings) | Medium | Low | Return ISO + optional display strings during migration | open |
| R-20 | Security | RLS enabled but bypassed by the service-role connection, giving false confidence | Medium | High | **Phase 9:** RLS enabled on all application tables; `scripts/check_rls.py` verifies. FastAPI authorization remains primary; Data API access is denied | mitigating |
| R-21 | Delivery | Official status changes/resolution photos have no current UI | High | Medium | **Phase 7:** status/resolution APIs are done; the official UI remains for Phase 9 | mitigating |
| R-22 | Data | Mock issues have no `resolvedImage`; before/after feature cannot be demonstrated | Medium | Low | Add resolution flow and seed images in a later phase | open |
| R-23 | Operations | Preview environments may accidentally use production data | Medium | High | Separate Supabase project/branch; environment guards | open |
| R-24 | Scope | Building endpoints for features that are only alerts/static (RTI, ward docket, notifications) wastes effort | High | Medium | Defer until the client is real; YAGNI | accepted |
| R-25 | Frontend | Expo SDK 58 requires Node 22.13+; README says 18/20 | Medium | Medium | Correct docs; add engines/.nvmrc | open |
| R-26 | Distribution | Google Play requires an AAB, target API level, privacy policy, data safety form, and content rating; review can reject the app | High | High | Prepare listing/legal artifacts early; declare location, personal info, and photos accurately; start with internal testing | open |
| R-27 | Local dev | Physical Android device cannot reach the PC backend due to firewall, guest Wi-Fi/client isolation, or an IP change | High | Medium | Bind `0.0.0.0`; firewall rule; same LAN; document `EXPO_PUBLIC_API_URL`; show the LAN IP in the dev runbook | open |
| R-28 | Mobile tooling | A required native module or remote push is unsupported in Expo Go, forcing a development build | Medium | Medium | Verify Expo Go compatibility before choosing a library; use a dev build only when necessary; defer push | open |
| R-29 | Distribution | EAS signing credentials, Play service-account key, or store account access is lost or leaked | Medium | High | EAS-managed keystore, restricted project access, backups, no committed credentials, least-privilege service account | open |
| R-30 | Security | Cleartext HTTP or a dev API URL ships in a release build | Medium | High | HTTPS-only production config; review release bundle; do not enable `usesCleartextTraffic`; secret/config scan before release | open |
| R-31 | Security | Supabase service-role key or DB credentials leak into the client bundle | Medium | Critical | Only anon/publishable key in `EXPO_PUBLIC_*`; service role server-only; bundle secret scan in CI/release checklist | open |
| R-32 | Architecture | Backend accidentally couples to Android-specific behavior, blocking future iOS | Low | Medium | Platform-neutral REST/JSON + JWT; no device identifiers in the schema; keep platform code in the client | open |
| R-33 | Data/Legal | The provided GeoJSON is OSM-derived; ODbL 1.0 attribution must be preserved, and the original file must not be altered | Medium | High | Keep `© OpenStreetMap contributors (ODbL 1.0)` in docs; keep the original file; do not store OSM metadata in app tables | open |
| R-34 | Data | The dataset has 145 ward names; Secunderabad, HITEC City, and Dilsukhnagar are not direct ward names and may be covered by adjacent wards | Medium | Medium | Treat as a documented coverage note; do not introduce an alternative dataset unless a concrete issue is found | open |
| R-35 | Data | OSM feature timestamps are 2017-12-31; boundaries may not reflect the current municipal structure | Medium | Medium | Recorded in ADR-009; the dataset remains the sole MVP source per the project owner; review only if a coverage/accuracy issue is documented | open |
| R-36 | Data | Invalid/self-intersecting or overlapping polygons could break point-in-polygon matching | Low | High | Verified 0 invalid and 0 overlapping pairs; re-run `ST_IsValid`/overlap checks on any replacement | closed |
| R-37 | Data | Ambiguous/unmatched area assignment | Medium | Medium | `ST_Covers`; return `matched`/`unmatched`/`ambiguous`; never choose a nearest match or fabricate a label | open |
| R-38 | Product | The current client captures no GPS, but create/confirm now require coordinates | High | High | Add `expo-location` before enabling create/confirm against the API; keep a server-side rejection path | open |
| R-39 | Data | Area assignment may be `unmatched` or `ambiguous`, leaving reports without an area | Medium | Medium | Surface status in the API/UI; allow admin review; do not fabricate a label | open |

## 3. Decisions log pointer

Significant architecture decisions are recorded as ADRs in `docs/engineering/decisions/`. **B-1 is resolved** (ADR-009). B-2…B-4 remain open and do not block Phase 1. The earlier TGRAC dataset questions are resolved by discontinuing that dataset.

## 4. Review cadence

Review at each milestone and before deployment. Close a risk only with evidence (e.g., DLT approval, GPS implementation merged, RLS test passing). Do not mark "mitigating" as "closed."
