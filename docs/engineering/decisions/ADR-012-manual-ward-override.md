# ADR-012 — Manual ward override for KML coverage gaps

- **Status:** Accepted (temporary), 2026-11-09
- **Deciders:** Project owner
- **Related:** ADR-008 (automatic area assignment), ADR-010 (GHMC KML)

## Context

`ghmc_wards.kml` is the sole 155-ward boundary dataset. A real device location
(`17.5705589, 78.4380271`) was checked with PostGIS `ST_Covers`: **0 polygons
contain it**. The nearest wards are `129-SURAM` (~1,840 m), `130-SUBHASH NAGAR`
(~1,871 m), and `125-GAJULARAMARAM` (~4,098 m). The point is north of the KML
bbox (max latitude `17.561001298`).

The previous behavior rejected such points (or required the user to move), which
blocks a legitimate citizen at the dataset edge. The owner asked for:

- manual ward selection from the available wards;
- a button that resolves the ward from the current location;
- the ability to submit even when the current location is not inside the chosen
  ward.

## Decision

Add an optional **manual ward override** to issue creation:

- `POST /api/v1/issues` accepts `areaId` (alias `areaId`).
- When `areaId` is supplied, the issue is linked to that ward and
  `area_assignment_status='manual'`. The automatic Hyderabad acceptance envelope
  is skipped for manual reports.
- Exact coordinates remain required and are stored only in
  `issue_private_locations`. The public payload never exposes them.
- The Create Issue screen provides:
  - a search box over the 155 wards (name/zone/circle);
  - a “Use My Location” action that resolves the ward via `/areas/at`;
  - a visible selected-ward card and an “Auto” action to clear the override.
- When no `areaId` is supplied, automatic derivation is unchanged:
  `matched` / `unmatched` / `ambiguous`, never guessed.
- A manual report is **not** presented as automatically matched. The status is
  `manual`.

Migration `b4f6a2c81d37` adds `manual` to the
`issues.area_assignment_status` check constraint.

## Consequences

- Citizens can submit at KML edges and remotely select a ward.
- Area filters (`areaId`) include manual reports; automatic filters can
  distinguish them by `areaAssignmentStatus=manual`.
- A manual ward is user-chosen and may not contain the exact coordinate. The
  location text is user-entered; coordinates remain the reporter's GPS point.
  This is a deliberate trade-off for the current build.
- The data gap remains: a verified polygon covering the point is still required
  for automatic assignment. The manual override is not a substitute for fixing
  the KML.
- Abuse potential: a user can attribute a report to the wrong ward. The `manual`
  status and the private exact coordinate preserve the distinction; moderation
  can review it.
- The earlier rule “users must not manually select an area” is superseded for
  this build by this ADR; automatic assignment remains the default.
