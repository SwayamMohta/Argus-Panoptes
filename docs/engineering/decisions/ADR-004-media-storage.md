# ADR-004 — Direct-to-Supabase Storage signed uploads

- **Status:** Proposed
- **Date:** 2026-11-08
- **Deciders:** Project owner + engineering

## Context

The app captures camera/gallery evidence but never uploads it. The backend runs on Vercel, which has a 4.5 MB request/response body limit and a read-only filesystem. Evidence photos may be 5–12 MB and may contain sensitive EXIF data.

## Options considered

1. **Backend issues a signed upload URL; client uploads directly to Supabase Storage** (recommended)
2. Client uploads multipart through FastAPI
3. Client stores images as base64 in Postgres

## Decision

Use option 1.

- `POST /api/v1/media/upload-url` validates purpose, MIME, and size, then returns a signed upload URL/token and object path.
- The client compresses and strips EXIF with `expo-image-manipulator`, then PUTs directly to Storage.
- Evidence bucket is private; the API returns short-lived signed download URLs.
- Avatars may use a public bucket or signed URLs; choose per privacy policy.
- Bucket limits: evidence 12 MB, avatars 5 MB; MIME whitelist JPEG/PNG/WebP.
- Object paths are scoped to the user (`evidence/<user-id>/<yyyy>/<mm>/<uuid>.jpg`).
- The backend records the object path; it never proxies image bytes.

## Rationale

- Avoids Vercel's 4.5 MB limit and function memory pressure.
- Offloads CDN/serving to Supabase.
- Signed URLs limit access to private evidence.
- Client-side EXIF stripping avoids native image processing on Vercel (no OS libraries, read-only FS).

## Consequences

- The client needs an upload flow and error/retry handling.
- Orphaned uploads require a cleanup job (later phase).
- Signed URLs are time-limited and cannot be revoked individually; deletion/rotation is the remedy.
- Client-side EXIF stripping is trust-dependent; the backend validates type/size but does not re-encode.
- Bucket policies and CORS must be configured correctly.

## Verification

Vercel's 4.5 MB body limit, read-only filesystem, Supabase signed uploads, and bucket size limits were verified against official documentation on 2026-11-08. No upload has been exercised against a real project.
