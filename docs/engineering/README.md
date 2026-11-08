# Argus Panoptes — Engineering Documentation

Index of the backend/database and Phase 9 documentation for the `with_supabase_backend` branch. Documentation distinguishes **verified** from code or official sources, planned, and assumption.

## Start here

| Document | Purpose |
|---|---|
| `../../TRACKER.md` | Current objective, status, blockers, next steps |
| `architecture/frontend-index.md` | Complete index of the existing Expo application |
| `architecture/backend-architecture.md` | Target backend architecture and deployment shape |
| `catalogs/system-catalog.md` | Components, modules, and verified dependency versions |
| `catalogs/interface-catalog.md` | API endpoint inventory + frontend-to-backend mapping |
| `catalogs/data-catalog.md` | PostgreSQL/PostGIS schema, relationships, indexes |
| `catalogs/security-catalog.md` | Auth, authorization, privacy, trust boundaries |
| `catalogs/operations-catalog.md` | Local Docker, migrations, Supabase, Vercel operations |
| `deployment-runbook.md` | **Canonical Vercel + Supabase deployment guide** |
| `phase9-validation-checklist.md` | Manual Expo Go/device validation checklist |
| `release-checklist.md` | Evidence-backed release gate (backend verified; deployment/mobile pending) |
| `privacy-retention.md` | Data inventory, retention, account deletion, RLS, EXIF, third parties |
| `map-tiles.md` | Tile provider configuration; there is no OSM API key |
| `mobile-delivery.md` | Android-first Expo Go, LAN testing, EAS Build/Submit, Play Store, credential boundary |
| `data-quality/ghmc_wards.md` | **Sole ward dataset (ADR-010):** `ghmc_wards.kml` structure, coverage, attribution, import rules |
| `data-quality/wards_hyderabad.md` | Superseded OSM ward dataset (ADR-009), kept for history |
| `catalogs/quality-catalog.md` | Test strategy and quality gates (backend suite + CI configured) |
| `requirements-traceability.md` | Frontend feature → API/table → phase → status |
| `implementation-roadmap.md` | Prioritized phases, deliverables, acceptance criteria |
| `technical-debt.md` | Existing frontend gaps and deliberate deferrals |
| `risk-register.md` | Delivery, security, data, and vendor risks + decisions required |
| `decisions/` | Architecture Decision Records (proposed) |

## Source-of-truth rules

- Frontend behaviour: the code under `frontend/src/`. The legacy root `CONTEXT.md` and `documentation.md` are intentionally not included in this branch.
- Versions: `frontend/package-lock.json` and the package's own `engines` field.
- Platform capabilities: official Expo, Vercel, and Supabase documentation (links in the catalogs).
- Backend design: the documents in this folder. Backend phases 0–8 and the Phase 9 frontend cut-over are implemented and verified locally; device validation and deployment are pending.

## Status legend

`planned` · `in-progress` · `review` · `done` · `blocked`
