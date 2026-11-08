# Agent Guidelines for Argus Panoptes

## 🚨 Protected Components
- **Camera Implementation in `src/screens/HomeScreen.js`**:
  - The camera component, state, lifecycle, pan responders, layout dimensions (200px compressed / 580px expanded), and controls are 100% OFF-LIMITS.
  - Never modify, refactor, wrap, or alter the camera logic under any circumstances.

## 🗺️ Geography Rules (Hyderabad-only)

- Hyderabad is the **only** supported region for the initial release.
- **Sole dataset:** `ghmc_wards.kml` at the repository root (155 GHMC wards). `wards_hyderabad.geojson` is superseded (ADR-010) and kept for history. Do not use TGRAC, NIC, colony boundaries, manual locality polygons, aliases, or any other area-tagging mechanism.
- Store the ward **`ward` name**, **`ZONE`**, **`CIRCLE`**, and **polygon** in the `areas` table (`id`, `name`, `zone`, `circle`, `geom`). Do not store OSM metadata or other source properties in application tables.
- Preserve the original KML. **Licence/attribution is unconfirmed** and must be confirmed by the project owner; do not label it ODbL/OSM.
- Do not seed asset data: the old GeoMap assets are Bengaluru/Delhi/Mumbai, not Hyderabad.
- Every problem/event must have exact coordinates stored separately from the derived area. Derive the area with `ST_Covers`; **never guess** — use `matched`, `unmatched`, or `ambiguous`.
- Users must not select or submit an area; the server derives it.
- Support area filtering and proximity search.
- See `docs/engineering/decisions/ADR-010-ghmc-kml-wards.md` and `ADR-008-area-assignment.md`.

## 📱 Mobile Delivery & Testing (Android-first)

- This is an **Android-first native mobile application** built with Expo + React Native. It is **not** a web app or PWA; web is a development convenience only.
- Initial distribution: **Google Play Store**. Keep the backend platform-agnostic so iOS can be added later.
- **Use Expo Go + the QR-code workflow** for ordinary development and testing. Do **not** generate APKs/AABs for routine changes.
- Run FastAPI and PostgreSQL locally. Bind FastAPI to `0.0.0.0` and reach it from the physical device via the PC's **LAN IP** on the same Wi-Fi; allow the port through the host firewall.
- Use an **Expo development build** only when a required native module or config plugin is unavailable in Expo Go.
- Use **EAS Build** for standalone-testing APKs and Play Store AABs; use **EAS Submit** for Play Console uploads.
- Production traffic must use **HTTPS**. Never ship cleartext HTTP or enable cleartext in release builds.
- The app may contain only public configuration: Supabase URL, Supabase **anon/publishable** key, and the API base URL.
- **Never** include the Supabase service-role key, database credentials, JWT signing secret, or any privileged backend credential in the app bundle.
- Remote push notifications require a development build (not supported in Expo Go on Android); plan accordingly.

Full runbook: `docs/engineering/mobile-delivery.md`.

## 🎨 UI & Badge Styling Rules
- **NEVER CREATE "AI-SLOP" BADGES**:
  - Do NOT combine pastel-tinted backgrounds + matching colored borders + colored text (e.g. yellow on light yellow, green on light green, blue on light blue).
  - Status indicators MUST use neutral slate containers (`#F8FAFC`, border `#E2E8F0`), a 6px status dot (`dotColor`), and slate text (`#334155`).
  - Verification / official tags MUST use minimal neutral circular icon badges, not verbose colored pills.
  - Active button states MUST use solid dark neutrals (`#1E2328`, white text `#FFFFFF`), never pastel tints.
  - Maintain an editorial, architectural, and clean civic intelligence aesthetic.

## ✂️ Code Quality & Hygiene (Ponytail mode)
- YAGNI: You Aren't Gonna Need It. Write boring, minimal code.
- Prune dead code, unused imports, and unneeded dependencies.
- Zero boilerplate or unnecessary abstractions.

