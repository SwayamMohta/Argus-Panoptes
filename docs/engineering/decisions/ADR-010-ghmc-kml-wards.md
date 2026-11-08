# ADR-010 — `ghmc_wards.kml` is the sole ward boundary dataset

- **Status:** Accepted (2026-11-08)
- **Date:** 2026-11-08
- **Deciders:** Project owner + engineering
- **Supersedes:** ADR-009 (`wards_hyderabad.geojson` as the sole area dataset)

## Context

ADR-009 adopted `wards_hyderabad.geojson` (145 OSM-derived wards, 2017 vintage) because it was the only verified Hyderabad boundary file available. The project owner has now supplied `ghmc_wards.kml`, a GHMC ward file with **155 wards** and ward number, zone, and circle attributes. It covers a slightly wider bbox and is the more complete administrative set.

`GeoMapScreen.js` still contained hardcoded wards/assets for Bengaluru, Delhi, and Mumbai. Those are non-shippable and must not be imported.

## Decision

Use **`ghmc_wards.kml`** as the sole ward boundary dataset for the Hyderabad MVP.

- Import each Placemark's `ward` value as `areas.name` (for example `121-KUKATPALLY`).
- Import the GHMC `ZONE` (falling back to `CIRCLE` when empty) as `areas.zone`.
- Import the GHMC `CIRCLE` as `areas.circle`.
- Import the polygon (Polygon or MultiPolygon) with `ST_MakeValid`, `ST_Force2D`, SRID 4326.
- Do **not** import OSM-style metadata or other source properties.
- Keep `wards_hyderabad.geojson` in the repository as historical input; it is no longer authoritative.
- Do not seed any asset data. The app has no verified Hyderabad asset dataset (B-3).

This is an owner-approved exception to the earlier "only `id`, `name`, `geom`" rule: GHMC zone/circle are civic administrative attributes required by the map, not source metadata.

## Verified source facts

| Check | Result |
|---|---|
| Format | KML 2.2, WGS84 lon/lat |
| Placemarks | **155** |
| Unique ward names | **155** |
| Empty/duplicate names | 0 / 0 |
| Geometry types | 148 Polygon, 7 MultiPolygon |
| Vertices | 43,510 |
| Invalid source geometries | 0 |
| BBox (lon/lat) | `78.238974956, 17.290716392, 78.621714901, 17.561001298` |
| Zones / circles | 7 GHMC zones + Cantonment and four GP/OU areas; 35 circles |
| Overlapping area pairs | 25, all boundary slivers (largest 27,281 m² ≈ 0.56% of a ward) |
| Recognizable names | Kukatpally, Banjara Hills, Madhapur, Gachibowli, Tolichowki |

## Consequences

- `areas` gains nullable `zone` and `circle` columns (migration `80f7f68cf6d8`).
- `/api/v1/wards` returns name, zone, circle, and centroid; `/api/v1/wards/{id}` returns the full polygon.
- `/api/v1/wards/boundaries` returns all 155 simplified polygons as one GeoJSON FeatureCollection for the map (default tolerance 0.0001°; the client requests 0.0005°).
- Boundary slivers can produce `ambiguous` area assignment for points inside them; the no-guess rule still applies.
- **Licence:** the project owner confirmed on 2026-11-08 that the KML may be treated as an **open dataset** for this project. Retain the original file and include GHMC attribution; exact licence wording is not recorded. Do not label it ODbL/OSM unless the owner supplies that wording.
- The map no longer uses hardcoded Bengaluru/Delhi/Mumbai data; it fetches Hyderabad boundaries from the API.
- Assets remain deferred; the map shows ward polygons only.

## Verification

`scripts/import_ghmc_wards.py` is idempotent and records `backend/data/ghmc_wards_import_report.json`. The import was run on 2026-11-08: 155 areas, 0 invalid geometries, 25 boundary-sliver overlap pairs.
