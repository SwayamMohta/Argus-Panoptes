# Requirements Traceability

> Status: **backend phases 0–8 implemented; frontend cut over (Phase 9) and build-verified, but not yet device-tested.** Backend entries are verified by pytest (112 tests). Device/Play Store items remain pending.

## 1. Requirement register

| ID | Requirement | Priority | Acceptance criteria | Interface | Data | Frontend status | Backend status |
|---|---|---|---|---|---|---|---|
| R-01 | Citizen can sign in with OTP | Must | Valid OTP creates a session; invalid/expired rejected; session survives restart | Supabase Auth | profiles, user_preferences | Wired: 6-digit email OTP + secure session | done (device test pending) |
| R-02 | Citizen can register a profile | Must | Name/handle/ward/email/phone persisted; handle unique | `GET/PATCH /users/me` | profiles | Wired | done (device test pending) |
| R-03 | Citizen can edit profile and avatar | Must | Changes persist; avatar stored in Storage | `PATCH /users/me`, avatar upload | profiles, Storage | Wired | done (device test pending) |
| R-04 | Citizen can choose a locality | Must | Search by ward name; selection persists (zone/circle available; landmarks unavailable) | `GET /wards?q=`, `GET /areas/at` | areas | Wired: search + GPS ward detection | done |
| R-05 | Citizen can view active municipal notices | Must | Filter by category/text; expired hidden | `GET /notices` | notices | Wired | done |
| R-06 | Citizen can capture evidence | Must | Camera/gallery image acquired, compressed visually losslessly, EXIF stripped, ≤1 MiB | Media upload URL | Storage | Wired: re-encode/compression/direct upload | done (device test pending) |
| R-07 | Citizen can create a report | Must | Title 5–100, description 1–500, location required; category valid; author auto-vote; timeline seeded | `POST /issues` | issues, events, votes | Wired: GPS required | done (device test pending) |
| R-08 | Citizen can report anonymously | Must | Public payload hides author; B-4 resolved as server-side pseudonymity | `POST /issues` | issues | Wired | done |
| R-09 | Citizen can browse category feeds | Must | Trending/new/top sorting; pagination | `GET /issues?categoryId=&sortBy=` | issues | Wired | done |
| R-10 | Citizen can view issue dossier | Must | Fields + 4-step timeline; comments via separate endpoint | `GET /issues/{id}` | issues, events | Wired | done |
| R-11 | Citizen can upvote/downvote | Must | Toggle/switch; net ≥0; one vote/user | `POST /issues/{id}/vote` | issue_votes | Wired + optimistic | done |
| R-12 | Citizen can confirm witnessed | Must | Toggle; one/user; count accurate; 2 km geo-fence | `POST /issues/{id}/confirm` | issue_confirmations | Wired: Witness control with GPS | done |
| R-13 | Citizen can comment and reply | Must | 1–500 chars; depth ≤3; reply to reply works | comments endpoints | comments, comment_votes | Wired: server-threaded | done |
| R-14 | Citizen can vote on comments | Should | Toggle upvote; one/user | `POST /comments/{id}/vote` | comment_votes | Wired | done |
| R-15 | Citizen can see personal activity | Should | Submitted/confirmed/resolved/tracked tabs | `GET /users/me/activity` | issues, votes, confirmations | Wired | done |
| R-16 | Citizen can save favorite places | Should | Add/pin/remove; persists | favorites endpoints | favorite_places | Wired: GPS add + pin toggle | done |
| R-17 | Citizen can export audit data | Should | GeoJSON/CSV/JSON file, own data only | `GET /users/me/export` | issues, private locations | Wired: file download/share | done |
| R-18 | Citizen can view civic impact | Should | Derived value/counts per sector | `GET /users/me/impact` | issues, categories | Wired | done |
| R-19 | Citizen can view SLAs/escalate | Should | 6 standards; escalation recorded | SLA endpoints | service_standards, sla_escalations | Wired | done |
| R-20 | Citizen can view map wards/assets | Should | Ward list/detail; issues per ward when present; assets when verified data exists | `/wards`, `/wards/{id}`, `/issues?areaId=` | areas, issues (assets deferred) | Wired: area-only map + issues below | done; assets deferred |
| R-21 | Citizen can view ward docket/RSVP | Could | Officials, meetings, RSVP | docket endpoints | ward_officials, meetings, rsvps | Static/alert | deferred |
| R-22 | Citizen can generate RTI | Could | Draft/generate RTI application | — | — | Alert only | deferred |
| R-23 | Citizen can verify via DigiLocker | Could | OAuth verification, badge reflects result | — | profiles | Hardcoded true | deferred |
| R-24 | User receives notifications | Could | Push/in-app for status/comments/wards | — | push_tokens | None | deferred |
| R-25 | Official can advance status | Should | Status + event + resolution photo | `POST /issues/{id}/status`, resolution endpoints | issues, events | None (deferred by owner) | done (API) |
| R-26 | Admin can moderate content | Should | Hide/remove abusive content; audit log | admin routes | issues, comments, admin_audit_log | None (deferred by owner) | done (API) |
| R-27 | Preferences persist | Must | All settings survive restart and devices | preferences endpoints | user_preferences | Wired | done |
| R-28 | Citizen can see a human-readable address for a map pin | Should | Coordinate → address with attribution; server-derived ward remains authoritative | `GET /geocode/reverse`, `GET /areas/at` | — | Area-only map; GPS ward detection wired; reverse-geocode display optional | done (reverse geocode API) |
| R-28b | Location privacy masking | Must | Public coordinate fuzzed within configured radius | server-side | issues, private locations | Toggle only | planned (no home anchor) |
| R-29 | Open data access | Could | Public issue export/API | open-data endpoint | issues | None | deferred |
| R-30 | App works offline / Wi-Fi sync | Could | Queue mutations; sync on Wi-Fi | — | — | Toggle only | deferred |

## 2. Feature → implementation mapping

| Frontend file/feature | Requirements | Primary endpoints | Primary tables |
|---|---|---|---|
| `AuthModal` + `AuthContext` | R-01, R-02, R-27 | Supabase Auth, `/users/me` | profiles, user_preferences |
| `EditProfileScreen`, `ProfileHeader` | R-03 | `/users/me`, avatar upload | profiles, Storage |
| `LocalityPickerModal`, `LocationHeader` | R-04 | `/wards`, `/areas/at` | areas |
| `NoticesNotificationModal` | R-05 | `/notices` | notices |
| `HomeScreen` camera | R-06 | media upload URL | Storage |
| `CreateIssueScreen` | R-07, R-08 | `POST /issues` | issues, events, votes, private locations |
| `CategoriesScreen`, `CategoryFeedScreen` | R-09 | `/categories`, `/issues` | categories, issues |
| `IssueDetailScreen` | R-10, R-11, R-13, R-14 | issue/comment endpoints | issues, events, comments, votes |
| `IssueDetailScreen` Witness control | R-12 | confirm endpoint | issue_confirmations |
| `PersonalCivicActivityModal` | R-15 | `/users/me/activity` | issues, votes, confirmations |
| `FavoritePlacesPage` | R-16 | favorites endpoints | favorite_places |
| `SettingsScreen` export | R-17 | `/users/me/export` | issues, events |
| `CivicImpactPage` | R-18 | `/users/me/impact` | issues, categories |
| `CitizenCharterPage` | R-19 | SLA endpoints | service_standards, sla_escalations |
| `GeoMapScreen` | R-20 | `/wards/boundaries`, `/issues?areaId=` | areas, issues (assets deferred) |
| `WardDocketPage` | R-21 | docket endpoints | ward_officials, meetings, rsvps |
| `RtiToolkitPage` | R-22 | — | — |
| `SettingsScreen` DigiLocker | R-23 | — | profiles.digilocker_verified |
| Settings notifications | R-24 | — | push_tokens |
| — (no UI) | R-25, R-26 | official/admin routes | issues, events, admin_audit_log |
| `SettingsScreen` privacy | R-28b | server-side | issues, private locations |
| `SettingsScreen` delete account | Compliance | `DELETE /users/me` | profiles, personal artifacts |

## 3. Definition of Ready (backend task)

- Requirement ID and acceptance criteria agreed.
- Interface and data catalog entries updated.
- Auth level and privacy behavior specified.
- Test cases identified.
- No unresolved decision blocks the task.

## 4. Definition of Done (backend task)

- Endpoint + migration implemented.
- Unit/integration tests pass with recorded output.
- Authorization and privacy cases covered.
- Migration tested on clean DB + Supabase branch.
- Catalogs/tracker updated.
- Frontend contract checked.

## 5. Status vocabulary

`planned` · `in-progress` · `review` · `done` · `blocked` · `deferred`

No row moves to `done` until its acceptance criteria are verified.
