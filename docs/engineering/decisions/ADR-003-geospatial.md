# ADR-003 — PostGIS for geospatial data and location privacy

- **Status:** Proposed
- **Date:** 2026-11-08
- **Deciders:** Project owner + engineering

## Context

The app promises distance-sorted feeds, map queries, ward filtering, ground-truth confirmations, and coordinate fuzzing. The current client captures no coordinates and uses text matching. The database must work locally in Docker and on Supabase.

## Options considered

1. **PostGIS `geography(Point,4326)` + GiST, with separate public and private location storage** (recommended)
2. Plain lat/lon numeric columns and haversine in application code
3. PostGIS `geometry` with SRID 4326 only

## Decision

Use option 1.

- `geography(Point,4326)` for report/asset/ward center points; `geography(Polygon,4326)` for ward boundaries.
- GiST indexes for spatial predicates.
- Store precise report coordinates in `issue_private_locations`; expose only `issues.geom` (possibly masked).
- Apply masking server-side when the user enables home-radius masking and the report falls within the configured radius of `profiles.home_geom`.
- Use `ST_DWithin`/`ST_Distance` in metres; never compute distance in the client for authoritative filters.
- Local Docker image: `postgis/postgis:17-3.5`; Supabase: enable `postgis` in the `extensions` schema.

## Rationale

- `geography` gives metre-based distance without manual projection.
- Separate private/public storage reduces the chance of leaking precise coordinates through an accidental `SELECT *`.
- Server-side masking is enforceable; the client cannot be trusted.
- PostGIS is supported on both local Docker and Supabase.

## Consequences

- The client must add `expo-location` and submit coordinates; until then, geo features are degraded and masking is inert.
- Coordinates may be null for text-only reports; the API must handle null gracefully and avoid fabricating distances.
- Search-path/extension configuration is required for Alembic and GeoAlchemy2.
- Ward boundaries and center points require data sourcing/licensing.
- Distance filters need a caller position or an explicit ward reference.

## Verification

PostGIS support and the recommended `extensions` schema on Supabase were verified on 2026-11-08. Local PostGIS has not been started or migrated yet.
