# Mobile Delivery, Testing & Distribution (Android-first)

> Status: **user-confirmed constraints**, captured 2026-11-08. No `eas.json`, Android package ID, signing credentials, Play Console app, APK, or AAB exists yet.

## 1. Platform stance

- Argus Panoptes is an **Android-first native mobile application**, not a web application or PWA.
- Keep the existing Expo + React Native frontend.
- Web (`react-native-web`) remains a development convenience; it is not a product target.
- The backend is mobile-agnostic: standard HTTPS/JSON APIs and Supabase JWT auth, so an iOS client can reuse it later.

## 2. Environment matrix

| Environment | App | Backend | Database | Auth/Storage |
|---|---|---|---|---|
| Local development | **Expo Go** on a physical Android device (QR) | FastAPI on the developer PC (`0.0.0.0:8000`) | Docker PostGIS on the PC | Supabase development project |
| Standalone testing | **EAS preview APK** | Local or staging API | Local or staging DB | Supabase development project |
| Production | **AAB via EAS → Play Store** | Vercel HTTPS | Supabase production | Supabase production |

## 3. Local device ↔ backend workflow

### Start the stack

```bash
# 1. Database (repository root)
docker compose up -d db

# 2. Backend — bind to all interfaces, not only localhost
cd backend
./.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Expo dev server
cd frontend
npx expo start
```

### Point the app at the PC

- Find the PC's LAN IPv4 address (`ipconfig` on Windows; e.g. `192.168.1.42`).
- Set the development API URL in `frontend/.env.local`:
  ```text
  EXPO_PUBLIC_API_URL=http://192.168.1.42:8000/api/v1
  ```
- The phone must be on the **same Wi-Fi/LAN** as the PC.
- Allow inbound TCP 8000 through the Windows Defender Firewall (private network).
- Avoid guest Wi-Fi or access points with client isolation; they block device-to-PC traffic.
- Android emulator uses `http://10.0.2.2:8000` instead of the LAN IP.
- `localhost` on the phone means the phone itself and will **not** reach the PC.

### CORS and HTTP

- Native Android requests are not subject to browser CORS; CORS matters for Expo web and future web clients. Configure explicit allowed origins; do not use `*` in production.
- HTTP is acceptable only for local LAN development. Production must use HTTPS.
- If LAN access is impossible, a temporary development tunnel (ngrok/Cloudflare Tunnel) is acceptable for testing; never use it as production infrastructure.

### Common failures

| Symptom | Check |
|---|---|
| Connection refused / timeout | Backend bound to `0.0.0.0`; firewall rule; same subnet; correct IP |
| Works on web, not on device | `EXPO_PUBLIC_API_URL` uses `localhost` — replace with LAN IP |
| Works on emulator, not device | Firewall or Wi-Fi client isolation |
| Mixed-content/cleartext error | Dev URL uses HTTPS with a self-signed cert, or release build blocks cleartext |
| Auth works but API 401 | Using the Supabase anon key instead of the user's access token |

## 4. Expo Go workflow (default)

- Run `npx expo start`; scan the QR code with Expo Go on the Android device.
- Use Fast Refresh for iteration. **Do not build APKs/AABs for ordinary development.**
- Verify on a physical device, not only an emulator:
  - camera permission and capture;
  - gallery picker;
  - API connectivity over the LAN;
  - auth sign-in and session restoration;
  - photo upload (signed direct upload);
  - votes, confirmations, comments;
  - map tiles and location permissions.

### Expo Go compatibility of planned modules

These are expected to work in Expo Go:

- `expo-camera`, `expo-image-picker`, `expo-location`
- `expo-secure-store`, `expo-image-manipulator`
- `expo-file-system`, `expo-sharing`
- `react-native-svg`, `@supabase/supabase-js`

Known limitation: **remote push notifications are not supported in Expo Go on Android** (SDK 53+). Push requires a development build with FCM configuration; defer push until a dev build is justified.

## 5. Development build (exception, not routine)

Create a development build only when:

- a required native module is not included in Expo Go; or
- a config plugin/custom native code is required; or
- push notifications must be tested.

Process:

```bash
cd frontend
npx expo install expo-dev-client
eas build --profile development --platform android
```

Document the reason in `TRACKER.md`. Return to Expo Go when the native dependency is no longer needed.

## 6. EAS Build

### Prerequisites (to add after approval)

- `android.package` in `app.json` (e.g. `com.arguspanoptes.app`).
- A URL `scheme` (e.g. `arguspanoptes`) for deep links/auth redirects.
- EAS project linked (`eas init`).
- Android signing credentials managed by EAS; back them up and restrict project access.
- `.easignore`/build config reviewed so secrets are not bundled.

### Planned `eas.json`

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Commands

```bash
# Standalone testing artifact only when needed
eas build --platform android --profile preview

# Play Store artifact
eas build --platform android --profile production
```

- `preview` produces an **APK** for sideloaded device testing.
- `production` produces an **AAB** for Google Play.
- Do not build on every change; use Expo Go first.
- Never commit the Android keystore, `credentials.json`, or Play service-account JSON.

## 7. EAS Submit

```bash
eas submit --platform android --profile production
```

Play Console prerequisites:

- App created in Play Console with the same package ID.
- Service account with release permissions (stored as an EAS secret or secure local path, never committed).
- Completed store listing, screenshots, content rating.
- **Privacy policy URL**.
- **Data safety form** declaring collected data (personal info, location, photos) and retention/sharing.
- Target API level and app version requirements satisfied.
- Start on the **internal testing** track; promote to closed/open/production after review.

## 8. Production networking and security

- Release builds communicate with the API over **HTTPS only** (Vercel-managed TLS).
- Set `EXPO_PUBLIC_API_URL=https://<vercel-domain>/api/v1`.
- Do not enable `usesCleartextTraffic` in release builds.
- The app may embed only public values:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key)
  - `EXPO_PUBLIC_API_URL`
- The app must **never** embed:
  - Supabase service-role key
  - database URL or credentials
  - JWT signing secret
  - SMS/email provider credentials
  - Vercel tokens or other server secrets
- Any privileged operation (moderation, status changes, signed upload URL issuance, exports requiring elevated access) is performed by FastAPI, never directly by the app with a privileged key.
- The anon key does not grant writes on its own; enforce RLS and backend authorization.
- Scan the production bundle for secrets before release.

## 9. Backend independence and future iOS

- No Android-specific behavior in the backend. Use standard REST/JSON + Supabase JWT.
- Avoid device-specific assumptions (IMEI, Android-only identifiers, platform-specific auth flows).
- Keep API contracts and error shapes platform-neutral.
- A future iOS client should reuse the same endpoints, database, auth, and storage.
- Platform-specific code (permissions, deep links, signing) stays in the mobile client.

## 10. Release checklist

- [ ] Device tested via Expo Go against the local FastAPI + PostGIS stack over LAN
- [ ] All critical flows work on a physical Android device
- [ ] Production API URL is HTTPS; no cleartext in release
- [ ] Secret scan confirms no service-role key/database credentials in the bundle
- [ ] `android.package`, `scheme`, version, and `versionCode` set
- [ ] EAS preview APK built and installed on a physical device
- [ ] Production AAB built and uploaded to internal testing
- [ ] Play listing, privacy policy, data safety form, and content rating complete
- [ ] Backend `/health` verified; auth, storage, and uploads verified on the release build
- [ ] Rollback path documented (previous Play release and Vercel deployment)

## 11. Not yet configured

The following are deliberately deferred until the backend plan is approved:

- `eas.json`
- Android package ID and URL scheme in `app.json`
- EAS project linkage and signing credentials
- Play Console app, service account, listing, privacy policy, data safety form
- First APK/AAB build
