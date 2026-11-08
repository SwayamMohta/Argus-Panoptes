# ADR-002 — Authentication via Supabase Auth, email OTP first

- **Status:** Accepted (2026-11-08; B-2 resolved as email OTP only)
- **Date:** 2026-11-08
- **Deciders:** Project owner + engineering

## Context

The current "auth" accepts any four characters and starts the app logged in as a demo user. The requested stack includes Supabase Auth. The UI accepts a phone or email and a 4-digit code. The app targets India, where SMS OTP requires TRAI DLT registration and a provider.

## Options considered

1. **Supabase Auth, email OTP first; phone OTP later** (recommended)
2. Supabase Auth, phone OTP only
3. Custom OTP implementation in FastAPI

## Decision

Use Supabase Auth. Launch with email OTP. Enable phone OTP only after a provider and DLT registration are ready. Do not implement OTP issuance in FastAPI.

- Set OTP length explicitly to **6** and update the client input.
- Verify access tokens in FastAPI via the project's JWKS (`kid`, ES256/RS256), validating `iss`, `aud`, `exp`, `sub`.
- Map `sub` to `profiles.id`; lazily create profile/preferences.
- Remove demo login from production; if retained for staging, gate it by environment and never trust a client-supplied user object.
- Store sessions with `expo-secure-store`.

## Rationale

- Supabase Auth is already in the target stack and removes a large security-sensitive surface.
- Email OTP has no DLT dependency and is the fastest path to a real sign-in.
- SMS OTP length is 6–10 digits, so the current 4-digit UI must change regardless.
- JWKS/asymmetric verification avoids shipping a shared JWT secret and supports key rotation.

## Consequences

- The frontend must add `@supabase/supabase-js` and a secure storage adapter.
- The documented `/auth/request-otp` and `/auth/verify-otp` endpoints are superseded by Supabase Auth.
- Email deliverability and rate limits (1 request/60s, 1-hour expiry) become product constraints.
- Phone OTP cost, provider choice, and DLT lead time are deferred risks.
- FastAPI must fetch and cache JWKS; unknown `kid` should trigger a refresh.

## Verification

Supabase email/phone OTP support, JWKS/asymmetric JWT recommendations, and OTP length/expiry/rate limits were verified against Supabase documentation on 2026-11-08. Project-specific configuration remains unverified until credentials are supplied.
