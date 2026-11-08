# ADR-005 — Vercel serverless FastAPI with Supavisor transaction pooling

- **Status:** Proposed
- **Date:** 2026-11-08
- **Deciders:** Project owner + engineering

## Context

The requested hosting is Vercel for the Python backend and Supabase for managed Postgres/Auth/Storage. Serverless functions have constrained bodies, ephemeral instances, and limited connection descriptors. A naive SQLAlchemy pool can exhaust Postgres connections.

## Options considered

1. **Vercel Functions (FastAPI) + Supavisor transaction mode (6543) + SQLAlchemy `NullPool`** (recommended)
2. Vercel + direct Postgres connections (5432)
3. A long-running container host (Cloud Run/Fly/Render) + Vercel only for the frontend

## Decision

Use option 1 for the MVP.

- Export a FastAPI `app` from a supported entrypoint (`backend/app/main.py`).
- Pin Python 3.13; declare `requires-python >=3.12,<3.15`.
- Configure `maxDuration` (30–60 s) in `vercel.json`.
- Connect through Supavisor transaction pooling on port 6543 with `poolclass=NullPool`.
- Run migrations with a direct/session connection outside the function.
- Keep the function bundle lean; avoid OS-level native libraries.
- Use Vercel Cron/Queues for future background work.

## Rationale

- Meets the requested hosting constraint.
- Transaction pooling is designed for serverless and avoids connection exhaustion.
- `NullPool` prevents per-instance pooling from multiplying connections.
- Official Vercel support for FastAPI and Python 3.12–3.14 is verified.

## Consequences

- Session-level Postgres features are unavailable in transaction mode.
- Cold starts add latency; keep imports light.
- The 4.5 MB body limit forces direct-to-storage uploads.
- Long-running/background work must move to queues or cron.
- If sustained throughput or websockets/background jobs become central, revisit option 3 (container host) while keeping the same API and schema.

## Verification

Vercel's FastAPI support, Python versions, body/bundle/filesystem/duration limits, and Supabase's Supavisor transaction-pooling + `NullPool` guidance were verified on 2026-11-08. No deployment has been performed.
