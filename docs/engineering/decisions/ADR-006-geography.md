# ADR-006 — Hyderabad-only geography (superseded dataset choice)

- **Status:** Superseded by ADR-009 (2026-11-08)
- **Deciders:** Project owner + engineering
- **Historical note:** This ADR selected TGRAC `COLONIES` layer 53. That dataset was investigated and then explicitly discontinued by the project owner in favour of the provided `wards_hyderabad.geojson`.

## What was decided at the time

- Hyderabad is the only supported region for the initial release.
- TGRAC `COLONIES` layer 53 (`MusiRiver/Musi_Basin_Web_Publication_vector`) was the proposed polygon source.
- `COLONY` was the primary label candidate, subject to coverage/quality checks.
- The source's WARD/CIRCLE/ZONE attributes were not to be treated as authoritative current municipal boundaries.

## Why it was superseded

The TGRAC layer was reachable (5,293 polygons), but:

- `COLONY` was granular and ambiguous: 3,918 unique normalized names, 515 duplicate groups (1,890 rows), and `OTHERS` appeared 158 times.
- Kukatpally, Madhapur, Secunderabad, HITEC City, Tolichowki, and Dilsukhnagar were absent as COLONY values.
- The service published no date, source, or license metadata.
- The project owner supplied `wards_hyderabad.geojson` and directed that it be the sole boundary dataset.

## Current decision

See **ADR-009**. The application uses only the ward `Name` and polygon from `wards_hyderabad.geojson`. No TGRAC, NIC, colony, manual locality, or alternative area-tagging dataset is used unless a coverage/accuracy issue is identified and documented.
