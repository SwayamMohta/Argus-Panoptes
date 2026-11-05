# Agent Guidelines for Argus Panoptes

## 🚨 Protected Components
- **Camera Implementation in `src/screens/HomeScreen.js`**:
  - The camera component, state, lifecycle, pan responders, layout dimensions (200px compressed / 580px expanded), and controls are 100% OFF-LIMITS.
  - Never modify, refactor, wrap, or alter the camera logic under any circumstances.

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

