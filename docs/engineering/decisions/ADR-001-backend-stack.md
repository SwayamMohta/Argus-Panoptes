# ADR-001 — Backend stack: FastAPI, SQLAlchemy, Alembic, PostgreSQL/PostGIS

- **Status:** Proposed
- **Date:** 2026-11-08
- **Deciders:** Project owner + engineering

## Context

The existing app is an Expo/React Native prototype with no backend. The requested target is Python/FastAPI, PostgreSQL, and SQLAlchemy/Alembic where appropriate, hosted on Vercel with Supabase-managed Postgres, Auth, and Storage. The domain needs proximity/distance queries, bounding boxes, and privacy masking.

## Options considered

1. **FastAPI + sync SQLAlchemy 2 + psycopg 3 + Alembic + PostGIS** (recommended)
2. FastAPI + async SQLAlchemy + asyncpg + PostGIS
3. Django + DRF
4. Node/NestJS or Go

## Decision

Use option 1.

- FastAPI ASGI app named `app`, deployable as a single Vercel Function.
- SQLAlchemy 2.0 sync sessions; FastAPI runs sync endpoints in a threadpool.
- psycopg 3 (binary) for Postgres.
- Alembic migrations with a direct/session connection.
- Pydantic v2 schemas with camelCase aliases for the Expo client.
- PostGIS `geography(Point,4326)` and GiST indexes.
- GeoAlchemy2 only for type support and DDL; raw SQL for distance/ranking where clearer.

## Rationale

- Sync SQLAlchemy is simpler to reason about and test; the workload is I/O-bound at modest scale.
- psycopg binary avoids native build complexity on Vercel.
- Alembic is explicit and reviewable, and works against both local PostGIS Docker and Supabase.
- Pydantic gives validation at the trust boundary.
- PostGIS is supported by Supabase and needed for distance/bbox and privacy masking.

## Consequences

- Use `NullPool` with Supavisor transaction mode; avoid session-level features.
- Async endpoints are optional; do not mix sync ORM sessions into async endpoints without a threadpool.
- Add a `SET search_path`/GeoAlchemy2 configuration for the `extensions` schema.
- Migration execution is a separate operation, never a cold-start side effect.
- If throughput later demands async, migrate incrementally rather than rewriting upfront.

## Verification

Stack compatibility with Vercel Python 3.12–3.14, FastAPI detection, PostGIS on Supabase, and Supavisor pooling was verified against official documentation on 2026-11-08. No runtime validation has been performed yet.
