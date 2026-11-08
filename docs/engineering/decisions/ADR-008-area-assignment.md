# ADR-008 — Area assignment, exact coordinates, and area/proximity search

- **Status:** Accepted (2026-11-08)
- **Deciders:** Project owner + engineering
- **Related:** ADR-009 (`wards_hyderabad.geojson` is the sole area dataset)

## Context

Every problem/event must have geographic coordinates. The application needs one user-facing area (ward) derived from the supplied ward polygons. Users must not choose or submit an area manually.

## Decision

### 1. Coordinates are required

- Every new problem/event must include exact `lat`/`lon`.
- Store the exact coordinate independently of the derived area:
  - exact location in a private record/table (for example `issue_private_locations.exact_geom` when issues are implemented);
  - a public/masked coordinate may be derived later for privacy.
- Area derivation always uses the exact coordinate.
- Reject create requests without valid coordinates once the client is updated. Never fabricate coordinates from text.

### 2. Area derivation

- The only source is the `areas` table imported from `wards_hyderabad.geojson` (id, name, polygon).
- On create (and on coordinate correction), run:
  - `ST_Covers(areas.geom, point)` using EPSG:4326.
- Outcomes:
  - **exactly one match** → `area_id` set, status `matched`.
  - **zero matches** → `area_id = NULL`, status `unmatched`.
  - **multiple matches** → `area_id = NULL`, status `ambiguous`; return all candidates.
- Do not choose a nearest polygon, nearest ward, or text match when the outcome is unmatched/ambiguous.
- Recompute area assignment if the ward dataset is replaced.

### 3. User-facing value

- The single user-facing `area` value is the ward `name`.
- The client never sends an area/ward field; the server ignores or rejects any client-supplied area.
- If no reliable match exists, return `area = null`; the UI shows "Area not assigned".

### 4. Storage

| Data | Storage | Exposure |
|---|---|---|
| Ward name + polygon | `areas(id, name, geom)` | Public |
| Exact report coordinate | private issue location record | Never public |
| Public/masked coordinate | issue geometry | Public API |
| Derived area | `issues.area_id` + assignment status | Public |

The `areas` table must not store OSM metadata (user, changeset, timestamp, version), ward/circle/zone attributes, aliases, or other dataset properties. Those remain in the original GeoJSON file.

### 5. Search

- **Area filter:** `GET /api/v1/issues?areaId=<uuid>`.
- **Area search:** `GET /api/v1/areas?q=<name>`.
- **Area lookup:** `GET /api/v1/areas/at?lat=&lon=` → `{status, area, candidates}`.
- **Proximity:** `GET /api/v1/issues?near=<lat>,<lon>&radiusM=<metres>` using `ST_DWithin`.
- Exact coordinates of other users are never exposed by proximity search.

### 6. Events

Any future geolocated event follows the same rule: store exact coordinates separately, derive the ward area via `ST_Covers`, and do not guess.

## Consequences

- The client must add GPS before create/confirm can succeed against the API.
- The 145-ward dataset is the MVP source of truth; no alternative dataset is introduced.
- Unmatched/ambiguous reports are visible as such and can be reviewed later.
- Replacing the dataset requires a documented coverage/accuracy issue and a new ADR.
