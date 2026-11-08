# System Catalog

> Status: frontend verified; backend planned. Sources: `frontend/package.json`, `frontend/package-lock.json`, Expo/Vercel/Supabase official docs (2026-11-08).

## 1. Applications and modules

| ID | Component | Type | Location | Status |
|---|---|---|---|---|
| FE-APP | Expo app shell, providers, custom tab navigation | Mobile/web app | `frontend/App.js` | Implemented |
| FE-CTX-AUTH | Identity, demo auth, profile, preferences | React context | `frontend/src/context/AuthContext.js` | Implemented (in-memory) |
| FE-CTX-ISSUES | Issue CRUD, votes, confirmations, comments | React context | `frontend/src/context/IssuesContext.js` | Implemented (in-memory) |
| FE-UI-HOME | Camera home, locality, notices, activity, ward widgets | UI | `frontend/src/screens/HomeScreen.js` + `components/home/` | Implemented |
| FE-UI-MAP | OSM map, 155 GHMC ward polygons, filters | UI | `frontend/src/screens/GeoMapScreen.js` | Implemented (API-backed wards; assets unavailable) |
| FE-UI-FEED | Categories, category feed, rubric | UI | `screens/CategoriesScreen.js`, `CategoryFeedScreen.js` | Implemented |
| FE-UI-ISSUE | Create/detail issue, community controls | UI | `screens/CreateIssueScreen.js`, `IssueDetailScreen.js`, `components/community/` | Implemented |
| FE-UI-PROFILE | Profile, edit, settings, subpages | UI | `screens/Profile*.js`, `EditProfileScreen.js`, `SettingsScreen.js`, `components/profile/` | Implemented (mostly static) |
| BE-API | FastAPI application | Backend service | `backend/app/` (planned) | Planned |
| BE-DB | PostgreSQL + PostGIS | Database | Docker local / Supabase | Planned |
| BE-AUTH | Supabase Auth | Managed service | Supabase project | Planned |
| BE-STORAGE | Supabase Storage | Managed service | Supabase project | Planned |
| MOB-EXPO-GO | Expo Go device workflow | Dev tool | Physical Android device + QR | User-confirmed default |
| MOB-EAS-BUILD | EAS Build (APK/AAB) | Build service | `eas.json` (planned) | Not configured |
| MOB-EAS-SUBMIT | EAS Submit to Play Console | Release service | Play Console (planned) | Not configured |

## 1.1 Platform target

- **Android-first native app**, not a web app/PWA.
- Initial distribution: Google Play Store.
- Web (`react-native-web`) is a development convenience only.
- Backend is platform-neutral so an iOS client can be added later.
- Daily testing uses Expo Go against a local FastAPI/PostGIS stack over LAN. APKs/AABs are produced only for standalone testing/releases.
- Planned mobile config (not created yet): `android.package`, URL scheme, `eas.json` profiles (development/preview/production), EAS project/signing, Play service account.
- Full runbook: `docs/engineering/mobile-delivery.md`.

## 2. Verified frontend dependency versions

| Package | Declared | Resolved | Official compatibility |
|---|---|---|---|
| `expo` | `^58.0.0` | **58.0.22** | Valid; SDK 58 current (released 2026-10-15); latest ~58.0.23 |
| `react` | `19.3.0` | **19.3.0** | Exact match for SDK 58 |
| `react-dom` | `19.3.0` | **19.3.0** | Exact match |
| `react-native` | `0.88.1` | **0.88.1** | Exact match; peers React `^19.3.0` |
| `react-native-web` | `^0.21.4` | **0.21.4** | Valid |
| `expo-camera` | `~58.0.14` | **58.0.14** | Exact match |
| `expo-image-picker` | `~58.0.10` | **58.0.10** | Exact match |
| `expo-status-bar` | `~58.0.4` | **58.0.4** | Exact match |
| `@expo/vector-icons` | `^15.0.2` | **15.1.1** | Valid |
| `react-native-svg` | `15.16.0` | **15.16.0** | Exact match |

Lockfile: version 3.

### Version flags

- No `engines`, `.nvmrc`, or `.node-version` in the repository. Add one to prevent Node 20/23/25 usage.
- The lockfile root lists four `@testing-library/*` packages that are absent from `package.json`; there are no tests. Recreating the lockfile will drop them.
- `newArchEnabled: true` is redundant: SDK 58 mandates the New Architecture.
- README's Node 18/20 guidance is stale and should be corrected.

## 3. Node and runtime requirements

| Runtime | Requirement | Local | Verdict |
|---|---|---|---|
| Expo SDK 58 | Node `^22.13.0 \|\| ^24.3.0 \|\| ^26.0.0 \|\| >=27.0.0` | v22.19.0 | Compatible |
| React Native 0.88.1 | Node `^22.13.0 \|\| ^24.3.0 \|\| >=26.0.0` | v22.19.0 | Compatible |
| Vercel Python | 3.12, 3.13, 3.14; default 3.12 | Backend venv 3.13 (system `python` is 3.10.8) | Compatible via the venv / `py -3.13` |
| Docker | Any current version | 28.5.1 | Compatible |

## 4. Backend dependencies

Scaffolded and installed in a Python 3.13 venv. Verified locally: FastAPI 0.162.2, SQLAlchemy 2.0.57, psycopg 3.3.8, GeoAlchemy2 0.21.0, Alembic 1.20.1, PyJWT 2.x with `cryptography`, pytest 9.0.3. Dependencies are range-pinned in `backend/pyproject.toml`, not exact-pinned. Observation, CI, and deployment tooling (`pip-audit`, gitleaks, Vercel) is not an application dependency.

| Package | Purpose | Notes |
|---|---|---|
| `fastapi` | ASGI framework | Vercel detects `app` |
| `uvicorn` | Local development server | Not used by Vercel production |
| `sqlalchemy>=2` | ORM/core | Sync sessions |
| `psycopg[binary]>=3` | Postgres driver | Avoids compiling libpq |
| `geoalchemy2` | PostGIS types | Install PostGIS in `extensions`; configure search path |
| `alembic` | Migrations | Use direct/session connection |
| `pydantic>=2` + `pydantic-settings` | Validation/config | camelCase aliases |
| `pyjwt[crypto]` | JWT verification | `PyJWKClient` for JWKS |
| `httpx` | Outbound calls/tests | JWKS fetch, Supabase Storage API |
| `python-multipart` | Multipart (if ever needed) | Not needed for direct uploads |
| `orjson` | Faster JSON (optional) | Only if profiling justifies |
| `pytest>=9.0.3` | Tests | Dev dependency (upgraded for PYSEC-2026-1845) |
| `ruff` | Lint/format | Dev dependency |
| `pip-audit` | Dependency audit | CI tool; not an application dependency |
| `gitleaks` | Secret scan | CI action; not an application dependency |
| stdlib `logging` + `contextvars` | JSON logs + request ids | `app/core/observability.py`; no added dependency |
| `mypy` (optional) | Types | Dev dependency |

Do **not** add: Celery/Redis (no background workload yet), Pillow/image processing (Vercel constraints; strip EXIF client-side), GDAL/GEOS (native system libraries), an ORM repository abstraction per table.

## 5. Platform facts relevant to the design

| Fact | Value | Source |
|---|---|---|
| Expo SDK 58 release | 2026-10-15 | Expo changelog |
| SDK 58 stack | RN 0.88, React 19.3.0 | Expo changelog |
| New Architecture | Mandatory from SDK 55+ | Expo docs |
| Vercel Python | 3.12 default; 3.13/3.14 supported | Vercel docs |
| Vercel FastAPI | Supported as one ASGI function | Vercel docs |
| Vercel body limit | 4.5 MB | Vercel function limits |
| Vercel bundle limit | 500 MB (5 GB Large Functions beta) | Vercel docs |
| Vercel FS | Read-only; `/tmp` ≤500 MB | Vercel docs |
| Supabase PostGIS | Supported; install in `extensions` | Supabase docs |
| Supabase JWT | Asymmetric ES256/RS256 + JWKS recommended | Supabase docs |
| Supabase OTP | Email/phone supported; expiry 1h; 1 request/60s | Supabase docs |
| Supabase SMS OTP length | 6–10 digits | Supabase docs |
| Supabase Storage | Signed upload/download URLs; bucket MIME/size limits | Supabase docs |
| Supabase pooler | Supavisor transaction mode on 6543; use `NullPool` | Supabase docs |

## 6. Frontend assets and static dependencies

- 8 category cover images in `frontend/src/assets/categories/`.
- OSM tile servers (no key) used by Home and GeoMap.
- 16 Unsplash image URLs in GeoMap and 2 in Home (fake capture fallback).
- No fonts, analytics, crash reporting, or feature flags.

## 7. Repository state

- Git branch `main`; latest commit `d95837a` (docs update).
- Untracked: `.mcp.json` (Supabase MCP endpoint).
- No `node_modules` installed in the working tree.
- No `backend/` directory.
- No CI configuration.
- No tests.
- `.gitignore` already anticipates `backend/`, Python virtualenvs, `.env`, and Expo artifacts.
