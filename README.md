# Argus Panoptes (Eyes That See It All) 👁️

> **Decentralized, geotagged citizen auditing platform for public services & infrastructure.**

---

## 🏛️ Mission & Core Sectors

Argus Panoptes enables citizens to perform structured, tamper-resistant audits of public infrastructure and welfare delivery points to build a transparent, open civic ledger:

1. **🏥 Local Health Centers & Anganwadis**: Medicine stock transparency, child nutrition kits, immunization records, sanitation, and staff attendance.
2. **🌾 Public Distribution System (PDS / Ration Shops)**: Grain quota stock display, electronic weigh scale calibration seals, and biometric POS uptime.
3. **🛣️ Local Roads & Street Lights**: Pothole severity, pedestrian footpaths, unlit night zones, and drainage cover integrity.
4. **🚌 Public Transport & Bus Stops**: Weather-protected shelter conditions, timetable legibility, night safety lighting, and accessibility.

---

## 🛠️ Getting Started & Setup Guide

Follow these instructions to clone, set up, and run the project on your local machine.

### 1. Prerequisites

Ensure you have the following installed on your computer:
- **Node.js**: Version `18.x` or `>=20.x` ([Download Node.js](https://nodejs.org/))
- **Git**: ([Download Git](https://git-scm.com/))
- **Expo Go App** *(Optional, for testing on physical mobile devices)*:
  - [Android on Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS on Apple App Store](https://apps.apple.com/app/expo-go/id982107779)

---

### 2. Clone the Repository

Open your terminal and run:

```bash
# Clone the repository
git clone https://github.com/SwayamMohta/Argus-Panoptes.git

# Navigate into the project folder
cd Argus-Panoptes
```

> **Note for collaborators pulling latest updates:**
> ```bash
> git checkout main
> git pull origin main
> ```

---

### 3. Install Dependencies

Install all required packages using `npm`:

```bash
npm install
```

---

### 4. Running the Application

You can run Argus Panoptes on the web or directly on your mobile device via Expo.

#### Option A: Run in Web Browser (Fastest)
```bash
npm run web
# or
npx expo start --web
```
This will start the local bundler and automatically launch the app at `http://localhost:8081` (or next available port).

#### Option B: Run on Mobile (iOS / Android with Expo Go)
```bash
npm start
# or with cache cleared
npx expo start -c
```
- **Android**: Open the **Expo Go** app and scan the QR code displayed in your terminal.
- **iOS**: Open the native **Camera** app, scan the QR code, and tap the notification to launch Expo Go.
- **Keyboard Shortcuts in Terminal**:
  - Press `w` → Open in Web browser
  - Press `a` → Open in Android Emulator
  - Press `i` → Open in iOS Simulator
  - Press `r` → Reload app
  - Press `c` → Clear bundler cache

---

## 📂 Project Structure

```text
argus_panoptes/
├── App.js                   # Root entry component & global navigation wrapper
├── app.json                 # Expo project configuration
├── package.json             # Project dependencies & scripts
├── public/                  # Static web assets & icons
└── src/
    ├── components/          # Reusable UI modules
    │   ├── modals/          # Auth, Media capture & verification modals
    │   ├── navigation/      # Curved bottom tab bar & headers
    │   └── profile/         # Civic badge & profile banner components
    ├── constants/           # Color palettes, mock datasets & navigation presets
    ├── context/             # Global state (AuthContext, Ledger state)
    └── screens/             # Main application views:
        ├── HomeScreen.js         # Sector selection & quick audits
        ├── SectorsScreen.js      # Detailed sector checklists & metrics
        ├── GeoMapScreen.js       # Interactive Map & Area Dashboard
        ├── LedgerScreen.js       # Public audit trail & verification feed
        ├── ProfileScreen.js      # Citizen profile, rank & badges
        ├── EditProfileScreen.js  # User profile edit settings
        └── SettingsScreen.js     # App preferences & diagnostics
```

---

## 📐 Design Philosophy: Clean, Utility-First & Zero "AI Slop"

To keep the application high-utility, intuitive, and professional (inspired by Notion and GovTech open standards), the following rules are enforced:

### 🚫 Excluded "AI Slop" Patterns
- **No decorative glowing gradient orbs** or rainbow blur backgrounds.
- **No hollow marketing buzzwords** (*"AI-powered hyper-synergistic future"*).
- **No decorative floating 3D meaningless bubbles** or distracting jiggling animations.
- **No low-contrast or illegible typography**.

### ✅ Notion-Style Design Principles
- **Neutral, warm, high-contrast palette**: Clean off-whites (`#FFFFFF`, `#FAFAF9`), subtle border separators (`#EAEAE8`, `#DFDFDE`), and dark slate typography (`#2F3437`, `#37352F`).
- **Functional callouts and badges**: Clear informational blocks with muted tint backgrounds (Amber, Green, Blue, Red).
- **High-density, structured data views**: Direct checklists, live GPS coordinates, audit IDs (`AUD-XXXX`), and status chips (`Verified`, `Under Review`, `Flagged Critical`, `Action Taken`).
- **Interactive audit workflow**: Live simulated hardware GPS locking, pass/fail checkpoint toggle, and open ledger inspection drawer.

---

## 🔧 Troubleshooting

- **Metro bundler cache issues**:
  ```bash
  npx expo start -c
  ```
- **Port already in use**:
  ```bash
  npx expo start --port 8082
  ```
- **Resetting dependencies**:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

## 🤝 Contributing Workflow

1. Create a feature branch: `git checkout -b feature/my-new-feature`
2. Make your edits and test locally using `npm run web` or `npx expo start`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push to your branch: `git push origin feature/my-new-feature`
5. Open a Pull Request on GitHub.
