# Argus Panoptes (Eyes That See It All)

> **Decentralized, geotagged citizen auditing platform for public services & infrastructure.**

---

## Mission & Core Sectors

Argus Panoptes enables citizens to discover, document, report, and verify public infrastructure problems across essential civic sectors:

1. **Local Health Centers & Anganwadis**: Medicine stock transparency, child nutrition kits, immunization records, sanitation, and staff attendance.
2. **Public Distribution System (PDS / Ration Shops)**: Grain quota stock display, electronic weigh scale calibration seals, and biometric POS uptime.
3. **Local Roads & Street Lights**: Pothole severity, pedestrian footpaths, unlit night zones, and drainage cover integrity.
4. **Public Transport & Bus Stops**: Weather-protected shelter conditions, timetable legibility, night safety lighting, and accessibility.

---

## Getting Started & Setup Guide

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

Install all required packages:

```bash
# Navigate to frontend folder
cd frontend
npm install
```

---

### 4. Running the Application

You can run Argus Panoptes on the web or directly on your mobile device via Expo.

#### Running from root directory:
```bash
npm run web      # Run web
npm start        # Run Expo bundler
```

#### Or directly inside `frontend/`:
```bash
cd frontend
npx expo start --web   # Run in Web browser
npx expo start         # Run on Mobile (iOS / Android with Expo Go)
```

- **Android**: Open the **Expo Go** app and scan the QR code displayed in your terminal.
- **iOS**: Open the native **Camera** app, scan the QR code, and tap the notification to launch Expo Go.
- **Keyboard Shortcuts in Terminal**:
  - Press `w` -> Open in Web browser
  - Press `a` -> Open in Android Emulator
  - Press `i` -> Open in iOS Simulator
  - Press `r` -> Reload app
  - Press `c` -> Clear bundler cache

---

## Project Structure

```text
argus_panoptes/
├── package.json             # Root orchestrator scripts
├── AGENTS.md                # Engineering rules & UI guidelines
├── CONTEXT.md               # System architectural documentation
└── frontend/                # React Native / Expo application
    ├── App.js               # Root entry component & global navigation wrapper
    ├── app.json             # Expo project configuration
    ├── package.json         # Frontend dependencies & scripts
    ├── public/              # Static web assets & icons
    └── src/
        ├── components/      # Reusable UI modules (modals, navigation, profile, home)
        ├── constants/       # Color palettes, mock datasets & navigation presets
        ├── context/         # Global state (AuthContext, IssuesContext)
        └── screens/         # Main application views:
            ├── HomeScreen.js         # Camera-first civic intelligence dashboard
            ├── CategoriesScreen.js   # Detailed category feeds & community reports
            ├── GeoMapScreen.js       # Interactive Map & Area Dashboard
            ├── ProfileScreen.js      # Citizen profile & civic records
            ├── EditProfileScreen.js  # User profile edit settings
            └── SettingsScreen.js     # App preferences & diagnostics
```

---

## Design Philosophy: Clean, Utility-First & Zero "AI Slop"

To keep the application high-utility, intuitive, and professional (inspired by Notion and GovTech open standards), the following rules are enforced:

### Excluded Patterns
- **No decorative glowing gradient orbs** or rainbow blur backgrounds.
- **No hollow marketing buzzwords** (*"AI-powered hyper-synergistic future"*).
- **No decorative floating 3D meaningless bubbles** or distracting jiggling animations.
- **No low-contrast or illegible typography**.

### Notion-Style Design Principles
- **Neutral, warm, high-contrast palette**: Clean off-whites (`#FFFFFF`, `#FAFAF9`), subtle border separators (`#EAEAE8`, `#DFDFDE`), and dark slate typography (`#2F3437`, `#37352F`).
- **Functional callouts and badges**: Clear informational blocks with muted tint backgrounds (Amber, Green, Blue, Red).
- **High-density, structured data views**: Direct checklists, live GPS coordinates, report IDs, and status chips (`Reported`, `Under Review`, `In Progress`, `Resolved`).
- **Interactive civic workflow**: Ground confirmation, visual evidence capture, and community support.

---

## Troubleshooting

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

## Contributing Workflow

1. Create a feature branch: `git checkout -b feature/my-new-feature`
2. Make your edits and test locally using `npm run web` or `npx expo start`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push to your branch: `git push origin feature/my-new-feature`
5. Open a Pull Request on GitHub.
