# UI Design & Badge Styling Rules

## 1. Absolute Prohibition of "AI-Slop" Badges
Under NO circumstances create badges, tags, or pills that combine:
- A pastel-tinted background (e.g., `#FEF3C7`, `#EFF6FF`, `#F5F3FF`, `#F0FDF4`, `#FEE2E2`, `#DCFCE7`, `#ECFDF5`, `#FFFBEB`)
- A matching colored border / outline (e.g., `#FDE68A`, `#BFDBFE`, `#DDD6FE`, `#86EFAC`, `#FECACA`, `#BBF7D0`)
- Saturated matching colored text (e.g., `#D97706`, `#2563EB`, `#7C3AED`, `#15803D`, `#DC2626`)

This visual pattern looks like generic AI-generated template slop and is strictly forbidden across Argus Panoptes.

## 2. Standard Civic Status Indicators
When displaying issue or entity status (e.g., Reported, Under Review, In Progress, Resolved):
- **Container**: Neutral slate surface (`backgroundColor: '#F8FAFC'`, `borderWidth: 1`, `borderColor: '#E2E8F0'`, `borderRadius: 6`, `paddingHorizontal: 8`, `paddingVertical: 3.5`).
- **Indicator**: A minimal 6px circular status dot (`width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor`).
- **Typography**: Clean, readable slate text (`fontSize: 11, fontWeight: '600', color: '#334155'`).

## 3. Official / Verification / Security Badges
- Replace long colored text badges with compact, circular icon badges.
- **Example**: `width: 20, height: 20, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'` containing a 12-13px `shield-checkmark` icon.

## 4. Active Interactive States & Toggles
- For buttons, action pills, chips, and toggles in their active/selected state:
  - Use architectural solid dark neutrals: `backgroundColor: '#1E2328'`, `borderColor: '#1E2328'`, text and icon color `#FFFFFF`.
  - Alternatively, use a clean slate-selected state: `backgroundColor: '#F1F5F9'`, `borderColor: '#CBD5E1'`, text `#1E293B`.
  - NEVER use pastel green/blue tints for active button or chip states.

## 5. Architectural Civic Minimalism
- Prioritize high-contrast typography hierarchy over colored decorative boxes.
- Keep borders uniform (1px `#E2E8F0` or `#E5E7EB`). Avoid colored accent left borders on cards.
- Backgrounds must remain clean neutrals (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`).

