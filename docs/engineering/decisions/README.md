# Architecture Decisions

| ADR | Title | Status | Needs user input |
|---|---|---|---|
| ADR-001 | Backend stack: FastAPI, SQLAlchemy, Alembic, PostgreSQL/PostGIS | Proposed | No |
| ADR-002 | Authentication via Supabase Auth, email OTP first | Accepted; client flow temporarily replaced by ADR-011 | No |
| ADR-003 | PostGIS for geospatial data and location privacy | Proposed | No |
| ADR-004 | Direct-to-Supabase Storage signed uploads | Proposed | No |
| ADR-005 | Vercel serverless FastAPI with Supavisor transaction pooling | Proposed | No |
| ADR-006 | Hyderabad-only geography (TGRAC attempt) | Superseded by ADR-009 | No |
| ADR-007 | Anonymous reporting semantics | Proposed | Yes — pseudonymity vs unlinkable |
| ADR-008 | Area assignment, exact coordinates, area/proximity search | Accepted | No |
| ADR-009 | `wards_hyderabad.geojson` is the sole area dataset | Superseded by ADR-010 | No |
| ADR-010 | `ghmc_wards.kml` is the sole ward boundary dataset | Accepted | No |
| ADR-011 | Email + password auth for the current build | Accepted (temporary) | No |
| ADR-012 | Manual ward override for KML coverage gaps | Accepted (temporary) | No |

Statuses: `Proposed`, `Accepted`, `Rejected`, `Superseded`.

Decisions become **Accepted** only after the project owner approves them. When a decision changes, add a new ADR and mark the old one `Superseded`; do not rewrite history.
