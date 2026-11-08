# ADR-009 — `wards_hyderabad.geojson` is the sole area dataset

- **Status:** Superseded by ADR-010 (`ghmc_wards.kml` is now the sole dataset) (2026-11-08)
- **Deciders:** Project owner + engineering
- **Supersedes:** ADR-006

## Context

The initial release is Hyderabad-only. The project owner provided `wards_hyderabad.geojson` and directed that it replace all previous acquisition approaches (TGRAC, NIC, colony boundaries, manual locality mapping). The app needs only two things from this dataset: the **ward name** and the **polygon**.

## Dataset inspection (verified 2026-11-08)

| Property | Value |
|---|---|
| File | `wards_hyderabad.geojson` (repository root, ~261 KB) |
| Type | `FeatureCollection` |
| Name | `wards_hyderabad` |
| CRS | No `crs` member; GeoJSON default WGS84 |
| Features | **145** |
| Geometry types | **140 Polygon, 5 MultiPolygon** |
| Coordinates | Include `z = 0.0`; forced to 2D on import |
| BBox (lon/lat) | `78.2717512, 17.2916377, 78.6212303, 17.5608321` |
| Properties | `Name`, `_id`, `_timestamp`, `_version`, `_changeset`, `_user`, `_uid`, `admin_level`, `boundary`, `type`, `tessellate`, `extrude`, `visibility` |
| Ward names | 145 unique, 0 empty, 0 duplicate groups |
| Invalid polygons | **0** (`ST_IsValid` on the source geometries) |
| Overlapping ward pairs | **0** (`ST_Intersects` + positive intersection area) |
| Sample point-in-polygon | 10 sampled wards each covered by exactly 1 polygon |
| Attribution | OSM-derived; ODbL 1.0; `© OpenStreetMap contributors` |
| Vintage | OSM feature timestamps are `2017-12-31` |

Recognizable names present: `Ward 121 Kukatpally`, `Ward 107 Madhapur`, `Ward 93 Banjara Hills`, `Ward 105 Gachibowli`, `Ward 68 Tolichowki`.

Names not present as direct ward names: Secunderabad, HITEC City, Dilsukhnagar. They may be covered by adjacent wards under different names. This is a documented coverage note; no alternative dataset is introduced.

## Decision

1. **Sole source:** `wards_hyderabad.geojson` is the only geographical boundary dataset for the initial release.
2. **Minimal storage:** the `areas` table stores only `id`, `name`, and `geom`. Do not store OSM user/changeset/timestamp/version or other source attributes in application tables.
3. **Import:** read the file, force 2D (`ST_Force2D`), repair with `ST_MakeValid`, convert to EPSG:4326, and upsert by ward name. Preserve the original file unchanged.
4. **Area assignment:** every problem/event stores exact latitude/longitude independently. The backend derives the area with `ST_Covers(areas.geom, point)`. Users never select or submit an area.
5. **No guessing:** one match → matched; zero → `area = null` / `unmatched`; multiple → `ambiguous`, return candidates and do not choose.
6. **Search:** support area filtering (`areaId`) and independent proximity search (`near` + `radiusM`).
7. **Attribution:** preserve `© OpenStreetMap contributors (ODbL 1.0)` in the repository documentation and the original GeoJSON file. Do not remove OSM attribution from the source file.
8. **No alternatives:** do not add TGRAC, NIC, colony, manual locality polygons, or a reverse-geocoding area mechanism unless a concrete coverage/accuracy issue is identified and documented.

## Consequences

- Hyderabad has 145 ward areas in the MVP. The current municipal structure may differ; the dataset is still the sole source per the project owner.
- The 2017 OSM vintage is recorded but not treated as a blocker.
- The app displays `area: null` when no ward matches; it must not fabricate a label.
- The client must capture GPS before create/confirm can succeed.
- A future dataset replacement requires a documented coverage/accuracy issue and a new ADR.
