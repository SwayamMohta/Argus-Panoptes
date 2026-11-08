# Data Quality — `wards_hyderabad.geojson`

> **Superseded 2026-11-08 by `ghmc_wards.kml` (ADR-010).** This document is retained for history. `wards_hyderabad.geojson` is no longer authoritative.

## Source and attribution

| Item | Value |
|---|---|
| File | `wards_hyderabad.geojson` (repository root, unchanged) |
| Format | GeoJSON `FeatureCollection` |
| Attribution | **© OpenStreetMap contributors** |
| License | **ODbL 1.0** (inferred from OSM relation IDs and OSM metadata) |
| Vintage | OSM feature timestamps: **2017-12-31** |
| CRS | No `crs` member; GeoJSON default WGS84 |
| BBox (lon/lat) | `78.2717512, 17.2916377, 78.6212303, 17.5608321` |

The original file is preserved unchanged. OSM metadata (`_id`, `_timestamp`, `_version`, `_changeset`, `_user`, `_uid`) is **not** stored in application tables.

## Structure

| Check | Result |
|---|---|
| Features | **145** |
| Geometry types | **140 Polygon, 5 MultiPolygon** |
| Coordinate dimension | `x, y, z` with `z = 0.0`; forced to 2D on import |
| Ward names (`Name`) | 145 unique |
| Empty names | 0 |
| Duplicate name groups | 0 |
| Invalid source geometries | 0 (`ST_IsValid`) |
| Overlapping ward pairs | 0 (`ST_Intersects` + positive intersection area) |
| Sample point-in-polygon | 10 sampled wards each covered by exactly 1 polygon |

## Recognizable-name coverage

| Name | Ward name(s) |
|---|---|
| Kukatpally | `Ward 121 Kukatpally` |
| Madhapur | `Ward 107 Madhapur` |
| Banjara Hills | `Ward 93 Banjara Hills` |
| Gachibowli | `Ward 105 Gachibowli` |
| Tolichowki | `Ward 68 Tolichowki` |
| Secunderabad | Not a direct ward name |
| HITEC City | Not a direct ward name |
| Dilsukhnagar | Not a direct ward name |

The last three are documented coverage notes. They may be covered by adjacent wards under different names. No alternative dataset is introduced; the project owner selected this file as the sole source.

## Import behavior

- Target table: `areas(id uuid, name varchar(200) unique, geom geometry(GEOMETRY,4326))`.
- Only the ward name and polygon are stored.
- Import: `ST_Force2D` → `ST_SetSRID(...,4326)` → `ST_MakeValid` → upsert by `name`.
- Spatial index: GiST `ix_areas_geom`.
- Script: `backend/scripts/import_wards.py`.
- Report output: `backend/data/wards_hyderabad_import_report.json`.

## Reproduction

```bash
cd backend
python -m scripts.import_wards
```

## Area lookup behavior

`GET /api/v1/areas/at?lat=&lon=` uses `ST_Covers(areas.geom, point)`:

- exactly one match → `matched` with `{id, name}`.
- zero matches → `unmatched`, `area = null`.
- multiple matches → `ambiguous`, `area = null`, candidates returned.

The API never selects a nearest ward or fabricates an area. Users cannot submit an area manually.
