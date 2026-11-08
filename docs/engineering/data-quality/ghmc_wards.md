# Data Quality — `ghmc_wards.kml`

> Verified and imported 2026-11-08. Sole ward boundary dataset for the Hyderabad MVP (ADR-010). Supersedes `wards_hyderabad.geojson`/ADR-009.

## Source and attribution

| Item | Value |
|---|---|
| File | `ghmc_wards.kml` (repository root, unchanged) |
| Format | KML 2.2, WGS84 lon/lat |
| Attribution | GHMC ward boundaries (project-owner supplied) |
| Licence | **Owner confirmed open use on 2026-11-08**; exact wording pending. Do not claim ODbL/OSM |
| CRS | WGS84 |
| BBox (lon/lat) | `78.238974956, 17.290716392, 78.621714901, 17.561001298` |

## Structure

| Check | Result |
|---|---|
| Placemarks | **155** |
| Unique `ward` names | **155** |
| Empty / duplicate names | 0 / 0 |
| Geometry types | 148 Polygon, 7 MultiPolygon |
| Vertices | 43,510 (max 1,316 per ward) |
| Invalid source geometries | 0 |
| Zones | 7 GHMC zones + Cantonment and four GP/OU areas |
| Circles | 35 |
| Overlapping area pairs | 25, all boundary slivers; largest 27,281 m² (0.56% / 1.40% of the two wards) |

## Import rules

- Read the `ward`, `ZONE`, `CIRCLE`, and polygon from each Placemark.
- Normalize whitespace in names.
- `zone = ZONE`, falling back to `CIRCLE` when `ZONE` is empty.
- Force 2D, set SRID 4326, apply `ST_MakeValid`.
- Upsert by `name`; replace unreferenced areas so the table matches the KML set.
- Do not import OSM metadata or other source properties.
- Do not seed assets; no verified Hyderabad asset dataset exists.

## Recognizable coverage

| Name | Ward |
|---|---|
| Kukatpally | 121-KUKATPALLY |
| Banjara Hills | 93-BANJARA HILLS |
| Madhapur | 107-MADHAPUR |
| Gachibowli | 105-GACHIBOWLI |
| Tolichowki | 68-TOLICHOWKI |

`SECUNDERABAD`, `HITEC CITY`, and `DILSUKHNAGAR` are not direct ward names in this file; document the coverage note rather than adding aliases.

**Coverage gap observed 2026-11-09:** coordinates `17.5705589, 78.4380271` (north of the KML bbox max latitude `17.561001298`) are not covered by any of the 155 polygons. `ST_Covers` returns 0; the nearest wards are `129-SURARAM` (~1,840 m), `130-SUBHASH NAGAR` (~1,871 m), and `125-GAJULARAMARAM` (~4,098 m). The app reports the nearest wards and stores such reports as `unmatched`; it never guesses a ward. A verified polygon for the missing area is required to assign a ward there.

## Verification

- Import script: `backend/scripts/import_ghmc_wards.py` (idempotent).
- Report: `backend/data/ghmc_wards_import_report.json`.
- Live API: `/api/v1/wards?q=Kukatpally` → `121-KUKATPALLY`, zone `KUKATPALLY ZONE`, circle `24-KUKATPALLY`.
- Boundaries payload: 155 features; 301 KB at 0.0001° tolerance, 159 KB at 0.0005°.
