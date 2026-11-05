# Argus Panoptes — Application Architecture & Context Guide

> **Project Name**: Argus Panoptes  
> **Platform**: React Native / Expo (Android, iOS & Web)  
> **Domain**: Civic Intelligence, Municipal Infrastructure Auditing & Community Issue Reporting (Greater Hyderabad / GHMC Focus)  
> **Document Purpose**: Complete reference document outlining the entire codebase structure, screen-by-screen options, navigation architecture, and technical functionality.

---

## 1. System Overview & Core Philosophy

Argus Panoptes is an architectural civic intelligence platform empowering citizens to document, verify, and monitor public infrastructure defects (potholes, water leaks, uncollected garbage, hazardous electrical wiring, broken streetlights). 

### Core Pillars
1. **Photographic Ground Truth**: Direct on-device camera engine for real-time visual inspection and rapid reporting with geospatial tagging.
2. **Community Ground Confirmation**: Citizens witness and confirm defects locally, creating high-signal municipal audit trails that prevent spam and accelerate municipal intervention.
3. **Privacy & Pseudonymous Whistleblowing**: Zero-knowledge reporting options with adjustable coordinate fuzzing (GPS masking) to protect citizen privacy.
4. **Architectural Civic Aesthetic**: Strict editorial visual language—clean neutrals (`#FFFFFF`, `#F8FAFC`, `#0F172A`, `#E2E8F0`), high-contrast typography, and zero pastel "AI-slop" badge styling.

---

## 2. Global State & Architecture

The application is structured around two central React Context providers:

### `AuthContext` (`src/context/AuthContext.js`)
Manages citizen identity, cryptographic pseudonymity, and security preferences:
- **Authentication State**: `isLoggedIn`, `user` profile (handle, avatar, banner theme, karma score, verified badges).
- **Privacy & Anonymity**: `pseudonymousMode` (toggle to hide citizen identity on public reports), `homeRadiusMasking` (coordinate fuzzing at 250m, 500m, or 1000m).
- **Interface & Hardware**: `autoSyncWifi`, `notificationsEnabled`, `themeMode`, `language` (English, Telugu, Hindi, Kannada, Tamil), and `isAppLockEnabled` with biometric timeout settings.
- **Methods**: `login()`, `signOut()`, `updateProfile()`, `togglePseudonymousMode()`, etc.

### `IssuesContext` (`src/context/IssuesContext.js`)
Provides real-time CRUD and social engagement state for civic reports:
- **Issues Roster**: Initialized with curated municipal issues across Greater Hyderabad wards (`src/constants/mockIssues.js`).
- **Interactive Engagement**:
  - `addIssue(newIssue)`: Prepends citizen-submitted reports with generated cryptographic IDs and timestamps.
  - `voteIssue(id, direction)`: Community upvoting and prioritization.
  - `confirmWitness(id)`: Records a citizen's physical ground confirmation ("Witnessed on site").
  - `addComment(issueId, commentText)`: Threaded civic discussions.
  - `resolveIssue(id)`: Updates status to `resolved` when municipal works are completed.
- **Computed Metrics**: Per-category counts, active vs. resolved ratios, and citizen-confirmed tallies.

---

## 3. Navigation Architecture

Navigation operates via a persistent curved bottom bar (`src/components/navigation/CurvedBottomBar.js`) providing seamless access to 4 primary tabs:

```
[ PERSISTENT CURVED TAB BAR ]
├── 1. HOME       -> HomeScreen.js (Live Camera Inspection + Locality Dashboard)
├── 2. MAP        -> GeoMapScreen.js (Interactive Geospatial Ward Map)
├── 3. CATEGORIES -> CategoriesScreen.js -> CategoryFeedScreen.js (Sector Community Feeds)
└── 4. PROFILE    -> ProfileScreen.js / GuestProfileScreen.js -> Subpages & Settings
```

---

## 4. Detailed Screen & Feature Breakdown

### Tab 1: Home Screen (`src/screens/HomeScreen.js`)

The core command center of the application, uniting real-time camera inspection with ward-level administrative filtering.

#### A. Top Header (`src/components/home/LocationHeader.js`)
- **Locality Capsule**: Compact pill displaying the active municipal ward (e.g., `Bahadurpally · Ward 129 ▾`). Tapping opens the `LocalityPickerModal`.
- **Personal Civic Activity Button**: Minimalist circular button with a fingerprint icon (`finger-print-outline`). Shows an alert dot when unviewed ground confirmations exist.
- **Municipal Notices Button**: Notification bell icon (`notifications-outline`) with an unread badge indicator.

#### B. Camera Inspection Engine (Protected Architecture)
- **Lifecycle & Modes**:
  - **Compressed Mode (200px)**: Compact viewport allowing citizens to view recent civic activities below.
  - **Expanded Mode (580px / 72% screen height)**: Expands dynamically via pan responder drag gestures or one-tap triggers for high-detail framing.
- **In-Camera Controls**:
  - Shutter button with animated capture feedback.
  - Camera flip (rear / front sensor toggle).
  - Flash / Torch mode selector.
  - Framing grid overlay toggle.
  - Gallery photo import fallback.
- **Post-Capture Action State**:
  - Once captured, displays an immediate full-frame preview with a green GPS fix pill.
  - Post-capture card with two primary actions:
    1. **"Report Civic Issue"**: Opens `CreateIssueScreen` with the captured image preloaded.
    2. **"Retake Photo"**: Discards preview and returns seamlessly to live camera framing.

#### C. Modals & Overlays Accessible from Home

1. **`LocalityPickerModal.js` (Locality & Ward Selector)**
   - **Modern Layout**: Smooth `fade` backdrop transition and `Animated.spring` slide-up sheet (zero dark film artifacts).
   - **Search Engine**: Live search across 9 GHMC municipal zones, 150+ wards, circles, and landmark corridors.
   - **GPS Auto-Detect Card**: Detects current GPS fix (`Bahadurpally · Ward 129`) with one-tap selection.
   - **Monitored Municipal Wards**: Quick cards for frequent civic areas (`Bahadurpally`, `Banjara Hills`, `Madhapur`, `Gachibowli`) displaying landmark corridors, ward codes, and active report counts.
   - **Keyboard Handling**: Integrated `KeyboardAvoidingView` with stable height prevents the sheet from collapsing or hiding beneath the software keyboard.

2. **`NoticesNotificationModal.js` (Municipal Notices & Circulars)**
   - Displays official municipal alerts from GHMC, HMWS&SB (Water), and TSSPDCL (Power).
   - Category filtering pills: *All Notices*, *Water Works*, *Roads & Traffic*, *Power Grid*.
   - Urgency indicators (High, Medium, Advisory) and administrative department attribution.

3. **`PersonalCivicActivityModal.js` (Personal Civic Activity)**
   - Tracks the logged-in citizen's personal civic footprint across 4 filter tabs:
     - **Confirmed**: Issues where the citizen pressed "Witnessed on site".
     - **Submitted**: Issues authored directly by the user.
     - **Resolved**: Tracked issues that reached completed municipal resolution.
     - **Tracked**: Issues upvoted or bookmarked for status monitoring.

---

### Tab 2: Geospatial Map (`src/screens/GeoMapScreen.js`)

An interactive mapping suite for geospatial inspection across Greater Hyderabad.

#### Options & Functionality:
- **Interactive Map Canvas**: Renders clustered issue pins colored by municipal sector with verified status halos.
- **Top Controls**:
  - Locality / Sector selector dropdown.
  - Interactive search bar to jump to specific roads or landmarks.
  - Map Layer Switcher: Heatmap view, Ward boundaries, and Sector density.
- **Bottom Issue Sheet**:
  - Tapping any map pin slides up an issue summary card with photo preview, category tag, distance, upvote count, and verified witness tally.
  - Direct navigation button to view complete details in `IssueDetailScreen`.

---

### Tab 3: Municipal Categories & Community Feeds

#### A. Categories Overview (`src/screens/CategoriesScreen.js`)
Presents the 8 core administrative sectors of public infrastructure with high-resolution photography and metrics:
1. **Roads & Potholes**: Asphalt defects, craters, sunken road shoulders.
2. **Water Works**: Broken supply pipelines, low pressure, contaminated water.
3. **Sanitation & Waste**: Overflowing dumper bins, illegal garbage dumping, uncleaned streets.
4. **Power Grid & Lighting**: Hanging electrical wires, transformer sparks, dark streetlights.
5. **Transit Stops**: Damaged bus shelters, missing timetable boards, encroached bays.
6. **Storm Drainage**: Open manholes, clogged storm culverts, waterlogging hazards.
7. **Public Health**: Vector breeding stagnant pools, stray animal hazards, clinic sanitation.
8. **PDS & Food Quality**: Fair price shop irregularities, food safety audit alerts.

Each category card displays:
- Sector name and icon.
- Active report counter and resolution percentage.
- One-tap transition to that category's community feed.

#### B. Category Community Feed (`src/screens/CategoryFeedScreen.js`)
Reddit/Civic-style community stream for a chosen municipal sector:
- **Sorting Tabs**: *Trending*, *Newest*, *Most Confirmed*, *Resolved*.
- **Issue Card Component (`src/components/community/IssueCard.js`)**:
  - Verified Report ID hash (e.g., `REP-R01-2026`).
  - Sector badge, location with ward name, and relative timestamp.
  - Photographic evidence thumbnail.
  - Upvote / downvote controls (`VoteControl.js`).
  - Community confirmation button (`CommunityConfirmationControl.js`).
  - Comment count and share button.
- **Tapping an Issue Card**: Opens full dossier in `IssueDetailScreen`.

---

### In-Place Subscreens: Issue Lifecycle

#### A. Issue Dossier Screen (`src/screens/IssueDetailScreen.js`)
Full administrative and citizen record for a specific defect:
- **Photo Evidence Gallery**: High-res images with full-screen zoom modal (`MediaModal.js`).
- **Administrative Status Timeline**:
  1. *Reported* -> 2. *Under Review* -> 3. *Field Inspection Assigned* -> 4. *Resolved*.
- **Ground Truth Verification Meter**: Visual progress bar showing citizen witness confirmations required to trigger priority escalation.
- **Location Dossier**: Exact street, ward, circle, and GPS coordinates.
- **Community Discussion (`CommentSection.js`, `CommentItem.js`)**: Citizens discuss repair progress, post follow-up updates, and verify contractor presence.

#### B. Create Issue Screen (`src/screens/CreateIssueScreen.js`)
The reporting engine triggered post-capture or from floating actions:
- **Evidence Card**: Captured photo thumbnail with GPS fix coordinates.
- **Category Selector**: Selects which municipal department is responsible.
- **Form Fields**: Issue title, comprehensive description, nearby landmark/colony.
- **Priority Assessment**: Standard, Urgent, or Safety Hazard.
- **Anonymous Reporting Toggle**: Encrypts reporter identity before submitting.
- **Submission Action**: Validates input, saves to global `IssuesContext`, and routes to the newly created issue.

---

### Tab 4: Profile, Audits & Civic Intelligence

#### A. Guest State (`src/screens/GuestProfileScreen.js`)
Displayed when the user is logged out:
- Highlights civic audit benefits (track reports, earn karma, participate in ward committees).
- One-tap button opening `AuthModal.js` to sign in or create an identity.

#### B. Authenticated Profile (`src/screens/ProfileScreen.js`)
- **Cover Banner (`ProfileBanner.js`)**: Customizable civic salute graphics (`CivicSaluteBannerSvg.js`).
- **Profile Header (`ProfileHeader.js`)**: Avatar, full name, citizen handle (`@ananya_k`), civic karma score, verified witness tier, and "Edit Profile" button (`EditProfileScreen.js`).
- **Sectioned Navigation Menu (`ProfileMenuList.js`)**:
  - Direct routes into 6 dedicated civic tools:

#### C. Dedicated Profile Subpages (`src/screens/ProfileSubPages.js`)

1. **My Audits (`MyAuditsPage`)**:
   - KPI Ribbon: Total Logged (14), Verified (12), In Review (2).
   - Feed of personal civic audits with sector badges, resolution scores, and cryptographic IDs (`REP-xxx-2026`).
2. **My Civic Impact (`CivicImpactPage`)**:
   - Calculates public fund waste prevented via early reporting (e.g., ₹1,02,400 saved).
   - Metrics for tax dollars optimized, resolution velocity, and neighborhood safety indices.
3. **Your Favorite Places (`FavoritePlacesPage`)**:
   - Save frequently monitored localities (Home, Workplace, Parents' Ward) for instant one-tap issue filtering.
4. **RTI & Legal Toolkit (`RtiToolkitPage`)**:
   - Automated Right to Information (RTI) application generator under Section 6(1) of the RTI Act 2005.
   - Pre-formatted templates for pending road repairs, water supply failures, and municipal fund allocation.
5. **Citizen Charter & SLAs (`CitizenCharterPage`)**:
   - Official GHMC statutory service level agreements (SLAs):
     - Pothole filling: 48 Hours.
     - Open manhole coverage: 6 Hours (Emergency).
     - Streetlight repair: 24 Hours.
     - Garbage clearance: 12 Hours.
6. **Ward Committee Docket (`WardDocketPage`)**:
   - Meeting schedules for Area Sabhas and Ward Committees under the 74th Constitutional Amendment.
   - Corporator contact directories, ward budget allocations, and public hearing minutes.

#### D. Settings Screen (`src/screens/SettingsScreen.js`)
Full configuration center for the app:
- **Anonymous Auditing & Identity**: Toggle pseudonymous handle encryption, review cryptographic keys.
- **Privacy & Coordinate Masking**: Fuzz location data by 250m, 500m, or 1000m to protect private residences.
- **Open Data Export**: Export personal audit history to **GeoJSON** (for QGIS/ArcGIS), **CSV** (for Excel/Sheets), or raw **JSON**.
- **Security & App Lock**: Require biometrics / PIN immediately, after 1 min, 5 min, or 15 min.
- **Language Switcher**: Instant localization across 5 languages (English, Telugu, Hindi, Kannada, Tamil).
- **Storage & Cache**: View photographic evidence cache size and clear local storage.

---

## 5. Directory Structure & Key Files

```
argus_panoptes/
├── package.json                              # Root orchestrator scripts
├── AGENTS.md                                 # Agent rules, protected camera guidelines, UI standards
├── CONTEXT.md                                # Comprehensive application architecture & context guide
└── frontend/                                 # React Native / Expo Mobile Application
    ├── App.js                                # Root application entry point & providers
    ├── app.json                              # Expo project configuration
    ├── package.json                          # Dependencies & scripts
    ├── public/                               # Web static assets
    └── src/
        ├── assets/
        │   └── categories/                   # Sector cover photography (roads, water, waste, etc.)
        ├── components/
        │   ├── community/                    # IssueCard, CommentSection, VoteControl, etc.
        │   ├── home/                         # LocationHeader, LocalityPickerModal, WardAtAGlance, etc.
        │   ├── modals/                       # AuthModal, MediaModal
        │   ├── navigation/                   # CurvedBottomBar
        │   └── profile/                      # ProfileBanner, ProfileHeader, ProfileMenuList, SVGs
        ├── constants/
        │   ├── categoriesData.js                 # 8 Municipal sectors metadata
        │   ├── categoryImages.js                 # Photographic asset mappings
        │   ├── colors.js                         # Brand color tokens
        │   ├── localities.js                     # GHMC wards, zones, circles & landmarks roster
        │   ├── mockIssues.js                     # Seed civic issues with coordinates & timelines
        │   ├── municipalNotices.js               # Official GHMC municipal circulars
        │   ├── presets.js                        # UI presets
        │   └── tabs.js                           # Bottom bar tab identifiers
        ├── context/
        │   ├── AuthContext.js                    # User identity & security state
        │   └── IssuesContext.js                  # Civic issues & engagement state
        └── screens/
            ├── CategoriesScreen.js               # 8-Sector grid overview
            ├── CategoryFeedScreen.js             # Sector community discussion feed
            ├── CreateIssueScreen.js              # Issue creation & evidence upload form
            ├── EditProfileScreen.js              # Citizen bio & banner editor
            ├── GeoMapScreen.js                   # Interactive geospatial ward map
            ├── GuestProfileScreen.js             # Logged-out landing state
            ├── HomeScreen.js                     # Camera inspection engine & command center
            ├── IssueDetailScreen.js              # Comprehensive issue dossier
            ├── ProfileScreen.js                  # User profile & menu hub
            ├── ProfileSubPages.js                # My Audits, RTI Toolkit, SLAs, Ward Dockets
            └── SettingsScreen.js                 # Security, Privacy, GPS Fuzzing & Data Export
```

---

## 6. Strict Development & Design Rules

1. **Protected Camera Implementation (`src/screens/HomeScreen.js`)**:
   - The camera component, state, lifecycle, pan responders, layout dimensions (`200px` compressed / `580px` expanded), and controls are **100% OFF-LIMITS**. Never alter or refactor this engine.
2. **Zero "AI-Slop" Badges**:
   - Never combine pastel backgrounds + matching colored borders + colored text (e.g. green-on-green, red-on-red).
   - Status indicators MUST use neutral slate containers (`#F8FAFC`, border `#E2E8F0`), a 6px status dot (`dotColor`), and slate text (`#334155`).
3. **Smooth Sheet Transitions**:
   - Modals use `animationType="fade"` for the background overlay with `Animated.spring` on the inner card container to avoid dark film translation glitches.
4. **Code Hygiene (Ponytail Mode)**:
   - Boring, minimal, readable code. Zero dead imports or unneeded abstraction layers.

