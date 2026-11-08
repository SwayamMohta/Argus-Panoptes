# Frontend Index — Argus Panoptes

> Status: **verified from source** on 2026-11-08. The Expo app under `frontend/` is a fully client-side prototype. There is no API client, persistence, authentication backend, GPS, or file upload anywhere in the source.
>
> **Product target: Android-first native app distributed via Google Play.** Web is a development convenience only, not a PWA deliverable. Routine testing uses Expo Go against a local backend; APKs/AABs are built only for standalone testing/releases.
>
> **Geography resolution:** Hyderabad only. The 155 GHMC ward polygons from `ghmc_wards.kml` (ADR-010) replace the static/hardcoded map data; the app uses the ward name, zone, circle, and polygon. `wards_hyderabad.geojson` is superseded. Bengaluru demo profiles remain non-shippable and must be corrected during cut-over. See ADR-010/ADR-008.
>
> **Backend readiness (Phase 5):** `ghmc_wards.kml` is now the sole source (155 wards, ADR-010). `GET /api/v1/wards?q=&zone=` returns name/zone/circle/centroid; `GET /api/v1/wards/{id}` returns the full polygon; `GET /api/v1/wards/boundaries` returns all simplified polygons for the map. **GeoMapScreen now fetches the boundaries endpoint and its hardcoded Bengaluru/Delhi/Mumbai wards/assets have been removed.** Assets remain unavailable because no verified Hyderabad asset dataset exists.

## 1. Verified stack

| Item | Value | Evidence |
|---|---|---|
| Expo SDK | 58.0.22 (`^58.0.0`) | `frontend/package-lock.json` |
| React Native | 0.88.1 | lockfile |
| React / React DOM | 19.3.0 | lockfile |
| react-native-web | 0.21.4 | lockfile |
| expo-camera | 58.0.14 | lockfile |
| expo-image-picker | 58.0.10 | lockfile |
| expo-status-bar | 58.0.4 | lockfile |
| @expo/vector-icons | 15.1.1 | lockfile |
| react-native-svg | 15.16.0 | lockfile |
| Node engine | `^22.13.0 \|\| ^24.3.0 \|\| ^26.0.0 \|\| >=27.0.0` (Expo 58) | Expo package `engines` |
| Local Node | v22.19.0 | environment check |
| Local Python | 3.10.8 | environment check (below Vercel's 3.12 minimum) |
| Docker | 28.5.1, daemon running | environment check |
| New Architecture | Mandatory in SDK 58; `newArchEnabled: true` is redundant | Expo docs |
| Web bundler | Metro | `app.json` |

**Do not trust the README's "Node 18.x or >=20.x" statement.** Node 20 is not supported by Expo SDK 58.

## 2. App shell and navigation

- Entry: `frontend/App.js` (161 lines).
- Providers: `AuthProvider` → `IssuesProvider` → `MainApp`.
- Navigation is **local state + conditional rendering**, not React Navigation.
- Four tabs from `src/constants/tabs.js`: `categories`, `home`, `map`, `profile`.
- Active tab state defaults to `home`.
- Custom animated `CurvedBottomBar` with SVG notch.
- Each tab renders one top-level screen; in-tab drill-downs are handled by screen-local state.
- Global modals mounted at app root: `AuthModal`, `MediaModal` (MediaModal is unreachable — see debt).

| Tab | Screen | Props |
|---|---|---|
| Categories | `CategoriesScreen` | none |
| Home | `HomeScreen` | `onNavigateTab` |
| GeoMap | `GeoMapScreen` | none |
| Profile | `ProfileScreen` | none |

## 3. State management

### `AuthContext` (`src/context/AuthContext.js`, 244 lines)

- Defaults to **logged in** (`isLoggedIn = true`) with `DEMO_ACCOUNTS[0]`.
- User fields: `name`, `handle`, `ward`, `address`, `area`, `city`, `state`, `pincode`, `email`, `phone`, avatar fields (`avatarType`, `avatarIcon`, `avatarIconColor`, `avatarBg`, `avatarUri`), `bannerTheme`, `auditsCount`, `resolvedCount`, `score`, `digiLockerVerified`.
- Auth methods: `loginWithDemo(account)`, `registerUser(name, ward, contact)`, `signOut()`.
- Profile methods: `updateUserProfile`, `updateAvatarPreset`, `updateAvatarUrl`, `resetAvatar`, `updateBannerTheme`.
- Preferences held in memory: `pseudonymousMode` (true), `homeRadiusMasking` (true), `showContactOnRTI` (false), `autoSyncWifi` (true), `notificationsEnabled` (true), `themeMode` (`system`), `nightMode` (false), `isAppLockEnabled` (false), `language` (`English`).
- `registerUser` invents a random handle, synthesises an email/phone, and hardcodes `digiLockerVerified: true`.
- Sign-out does not clear `user`.
- No token, session, persistence, or auth gate.

### `IssuesContext` (`src/context/IssuesContext.js`, 267 lines)

- State is `MOCK_ISSUES` (18 records) in `useState`; nothing is persisted.
- `voteIssue(id, direction)` toggles/switches votes; net count clamped at 0.
- `confirmIssue(id)` toggles "witnessed"; count clamped at 0.
- `addIssue(data)` prepends a client-generated issue; author auto-upvotes (count starts at 1); seeds a 4-step timeline.
- `addComment(issueId, text, parentCommentId, authorInfo)` supports **top-level comments and replies to top-level comments only**; replies to replies are silently dropped while `commentsCount` still increments.
- `voteComment` toggles upvote/downvote; UI only exposes upvote.
- `getIssuesByCategory(categoryId, sortBy)` implements `new`, `top`, `trending`.
- `getIssueById`.

## 4. Screen index

| Screen | Lines | Purpose | Key data |
|---|---:|---|---|
| `HomeScreen` | 1,215 | Camera command center, locality header, notices, activity, ward widgets | issues, localities, notices |
| `GeoMapScreen` | ~3,714 | OSM slippy map, 155 GHMC ward polygons from API, filters | API-backed wards; assets unavailable |
| `CategoriesScreen` | 200 | 2-column sector grid; internal feed/detail/create routing | 8 categories |
| `CategoryFeedScreen` | 670 | Sector feed with trending/new/top, rubric modal, FAB | issues by category |
| `CreateIssueScreen` | 730 | Report form: title, description, location, one photo, anonymous | no coordinates |
| `IssueDetailScreen` | 664 | Dossier, 4-step timeline, vote, comments, share | issue, comments |
| `ProfileScreen` | 100 | Authenticated profile hub | user |
| `GuestProfileScreen` | 263 | Logged-out profile and demo login | demo accounts |
| `ProfileSubPages` | 972 | 6 tool pages (audits, impact, favorites, RTI, SLAs, ward docket) | all static/local |
| `SettingsScreen` | 1,471 | Privacy, masking, security, language, notifications, export, cache | mostly local state |
| `EditProfileScreen` | 726 | Contact/address/avatar editing | user |

### 4.1 Home

- Header: locality capsule, activity (fingerprint) button, notices bell.
- Camera (protected): compressed 200 px / expanded up to 72% screen (≤ 580 px); front/back, torch, zoom, grid, gallery; capture to full preview; "Report Civic Issue" / "Retake Photo".
- Camera reports are **always pre-assigned `CATEGORIES_DATA[2]` (roads)**; the user cannot choose a category on capture.
- Capture failure/cancel falls back to a hardcoded Unsplash image.
- Locality picker: 9 localities, search over name/ward/zone/circle/landmarks, 4 hardcoded "monitored" cards. **"Use Current Location" always selects `bahadurpally`; no geolocation.**
- Ward issue filtering is a **text-substring match** on `issue.location` against locality name/ward/landmarks; issues have no `localityId`.
- Notices modal never filters by locality; tabs are all/water/roads/power/weather (no `infrastructure` chip).
- Unread badge = count of notices matching locality or weather; no read state and no expiry check.
- Personal civic activity tabs:
  - Submitted: `author === user.name || author === 'u/civic_scout_91' || author === 'Anonymous Citizen'`.
  - Witnessed: `userConfirmed`.
  - Resolved: `status === 'resolved'` (all users).
  - Tracked: `userConfirmed || userVote > 0`. **There is no bookmark entity.**
- Quick action dock: gallery, notices, activity; hidden when camera expands.
- `WardAtAGlance`: OSM tiles, hardcoded 13 locality/ward coordinates (9 Hyderabad + 4 Bengaluru), animated center pin, nearby count.
- `WardRecentlyResolved`: before/after toggle if `resolvedImage`/`afterImage` exists; **no mock issue has either field**, so the toggle never appears.
- `WardNeedsAttention`, `NearbyIssuesSection`, `NearbyIssueCard`, `MunicipalNoticeSection`, `CommunityConfirmationControl` are currently unused by Home.

### 4.2 GeoMap

- OSM tile engine (zoom 3.5–18.5), pinch zoom, pan, double-tap, zoom buttons, fly-to, national view.
- Hardcoded geography: **7 wards / 16 assets** — Indiranagar, Domlur, Koramangala, HSR Layout, Bellandur (Bengaluru), Connaught Place (Delhi), Nariman Point (Mumbai).
- Ward fields: `id`, `name`, `wardNumber`, `zone`, `distance` (display string), `coverage` (display string), `healthScore`, `openFlags`, `coordinates`, `lat`, `lon`, `assets[]`.
- Ward filters: sort (`distance`, `flags_high`, `health_low`, `health_high`, `coverage`, `name`), risk (`critical` >2 flags, `moderate` 1–2, `clear` 0), distance (any/2/5/10 km), zone, sector.
- Zones are inconsistent: `East Zone`, `South Zone`, `Mahadevapura`, `New Delhi`, `South Mumbai`.
- Asset fields: `id`, `title`, `problemSummary`, `sector`, `sectorIcon`, `severity`, `severityColor`, `status`, `statusColor`, `imageUri`, `address`, `coordinates`, `lat`, `lon`, `auditedBy`, `lastAudit`, `notes`, `actionRequired`, `sla`.
- Asset filters: sort (`urgency`, `recent`, `category`; `recent` is a no-op because there is no timestamp), sector, severity, status.
- Asset modal: department-style attribution (`auditedBy`), last audit, notes, action, SLA. "Take Inspection Photo" only closes the modal.
- Latitude/longitude on assets are unused; map pins are ward-level only.
- Tile sources (no key): OSM, then two OSM France HOT fallbacks. No attribution UI.

### 4.3 Categories and feed

- Grid shows only image + name; the category metadata (compliance score, asset count, etc.) is not rendered.
- Feed sorts: `new` = `createdAt` desc; `top` = `upvotes` desc; `trending` = `upvotes*1.5 + commentsCount*2` desc.
- Pull-to-refresh is a 600 ms timer.
- Rubric modal shows 4 checkpoints per category; checkbox state is ephemeral. Its "Report" button only closes the modal.
- Issue card: author, time, status, title, description, image, location, votes, comments.

### 4.4 Create issue

- Fields: title (5–100), description (1–500), locality/area (required, free text), one optional image, anonymous toggle.
- Quick location chips for 8 Hyderabad localities.
- No GPS/coordinates, no category selection, no severity/priority field.
- One image only; gallery/camera/sample image.
- Submit calls `addIssue({ categoryId, title, description, location, image, imageCaption, isAnonymous, author })`.

### 4.5 Issue detail

- Shows author/badge, reported time, status, title, location, description, one photo + caption.
- Timeline built from four steps: `reported`, `under_review`, `in_progress`, `resolved`; each has `key`, `label`, `date` (display string), `description`, `completed`.
- Vote control; comments; share (web clipboard / native `Share`).
- **No confirmation ("witnessed") control** and no admin/status actions.
- Comment nesting UI allows reply at depth < 3, but persistence only supports replies to top-level comments.

### 4.6 Profile and settings

- Profile header: avatar, name, DigiLocker badge, handle, ward.
- Profile menu badges are hardcoded ("14 Logged", "₹1,02,400", "3 Monitored", "Ward 102").
- All six subpages are static or component-local:
  - My Audits: 4 hardcoded records; KPI ribbon hardcoded 14/12/2.
  - Civic Impact: hardcoded ₹1,02,400 and sector savings.
  - Favorite Places: 3 local places, pin toggles in component state.
  - RTI Toolkit: alert only; clipboard copy is not implemented.
  - Citizen Charter: 6 static SLA rows; escalate is an alert.
  - Ward Docket: static Ward 102 roster/agenda; RSVP is an alert.
- Settings:
  - Context-backed toggles persist only for the session.
  - GPS radius (250/500/1000 m), lock timeout, notification channels, and auto-clear-cache live in component state and reset on navigation.
  - Export is a 1-second `setTimeout` + alert; no file is created or downloaded.
  - Cache clear only changes a local string.
  - DigiLocker refresh is an alert.
  - No i18n engine; language selection is stored but unused.
  - No biometric/app-lock implementation.
  - No push-token registration.
- Edit Profile: name required; pincode 6 digits; emails/phones not format-validated; updates in-memory; avatar picked locally (no upload).

## 5. Component index

| Group | Components |
|---|---|
| `community/` | `IssueCard`, `VoteControl`, `CommentSection`, `CommentItem` |
| `home/` | `LocationHeader`, `LocalityPickerModal`, `NoticesNotificationModal`, `PersonalCivicActivityModal`, `QuickActionDock`, `WardAtAGlance`, `WardNeedsAttention`, `WardRecentlyResolved`, `MunicipalNoticeCard`, `MunicipalNoticeSection`, `NearbyIssueCard`, `NearbyIssuesSection`, `CommunityConfirmationControl` |
| `modals/` | `AuthModal`, `MediaModal` |
| `navigation/` | `CurvedBottomBar` |
| `profile/` | `ProfileBanner`, `ProfileHeader`, `ProfileMenuList`, `CivicSaluteBannerSvg` |

Materially unused: `WardNeedsAttention`, `NearbyIssuesSection`, `NearbyIssueCard`, `MunicipalNoticeSection`, `CommunityConfirmationControl`, `MediaModal` (mounted but never opened), `updateAvatarPreset`, `updateBannerTheme`.

## 6. Constant datasets

| Module | Records | Fields |
|---|---:|---|
| `categoriesData.js` | 8 categories, 32 checkpoints (4 each) | `id, name, shortName, icon, color, bgColor, status, statusLabel, complianceScore, activeAssetsCount, lastAuditedDaysAgo, description, checkpoints[{id,title,desc,isCritical}]` |
| `localities.js` | 9 Hyderabad localities | `id, name, ward, zone, circle, landmarks[]` |
| `municipalNotices.js` | 5 notices | `id, title, summary, locality, localityIds[], category, categoryLabel, source, publishedDate, expiryDate, isOfficial, impact, contactHelpline` |
| `mockIssues.js` | 18 issues | `id, categoryId, title, description, location, author, authorBadge, isAnonymous, image, imageCaption, createdAt, timeAgo, upvotes, userVote, confirmationsCount, userConfirmed, status, statusLabel, timeline[], commentsCount, comments[]` |
| `presets.js` | 2 demo accounts | full user shape |
| `categoryImages.js` | 8 images | category → `require()` asset |
| `colors.js` | brand palette | 14 tokens |
| `tabs.js` | 4 tabs | `id, label, icon, activeIcon` |

Category IDs: `health`, `ration`, `roads`, `transit`, `water`, `sanitation`, `power`, `drainage`.

Status values: `reported`, `under_review`, `in_progress`, `resolved`.

## 7. User flows

1. **Report:** Home camera/gallery → preview → Create Issue (roads pre-assigned) → `addIssue` → Category feed / issue detail.
2. **Browse feed:** Categories grid → sector feed → sort → issue detail.
3. **Engage:** vote on issue; comment/reply; share. Confirmation exists in context but only reachable through unused components.
4. **Locality:** header capsule → search/select locality → home widgets re-filter by text.
5. **Notices:** bell/dock → modal category filter; no read state.
6. **Activity:** fingerprint/dock → 4 derived tabs.
7. **Map:** OSM pan/zoom → select ward → filter assets → asset detail.
8. **Profile:** guest → fake OTP/demo login → profile → edit avatar/details → settings/subpages.
9. **Settings:** toggles only; export/cache/DigiLocker/notifications are simulated.

## 8. Integrations present

| Integration | Reality |
|---|---|
| `expo-camera` | Real camera preview/capture |
| `expo-image-picker` | Real gallery/camera picker; local URIs or data URLs |
| OSM tile servers | Direct image requests from GeoMap and WardAtAGlance |
| Unsplash | Hardcoded demo images, including a fake capture fallback |
| React Native `Share` / web clipboard | Issue share only |

## 9. Integrations absent (backend-relevant)

- No `fetch`/`axios`/WebSocket/GraphQL.
- No `AsyncStorage`, `SecureStore`, or any persistence.
- No Supabase client, no API base URL, no auth token.
- No `expo-location` or geolocation; all "GPS" is hardcoded or text.
- No file upload, filesystem, sharing, or document picker for exports.
- No push notifications or push-token registration.
- No i18n library; no biometrics.
- No tests, lint config, CI, or `engines` enforcement.

## 10. Documented claims that do not match code

| Claim | Reality |
|---|---|
| Node 18/20 supported (README) | Expo SDK 58 requires Node 22.13+/24.3+/26+ |
| 150+ wards (CONTEXT) | 9 localities; GeoMap has 7 hardcoded wards |
| GPS fix pill / coordinate capture | No geolocation; no coordinates anywhere |
| Anonymous "zero-knowledge" encryption | Boolean label change only |
| GPS masking 250/500/1000 m | UI only; no perturbation |
| Image/EXIF handling, S3 upload | No upload at all |
| Data export to GeoJSON/CSV/JSON | Alert only |
| DigiLocker verification | Hardcoded `true` |
| Push notifications | None |
| Comments nested 3 levels | UI allows depth, context drops replies to replies |
| Issue `localityId`/ward fields | Absent; filtering is text matching |
| Resolved before/after photos | No mock issue has the fields |
| `Tracked` bookmark tab | Derived from confirmations/upvotes; no bookmark |
| Real OTP auth | Any 4 characters accepted; demo bypass |
| Camera can report any sector | Camera reports are always Roads |
| MediaModal avatar presets | No presets rendered; modal unreachable |
| `CATEGORIES_DATA[2]` fallback in CreateIssue | Not imported; would throw if `category` omitted |
