# ADR-011 — Email + password auth for the current build

- **Status:** Accepted (temporary), 2026-11-09
- **Deciders:** Project owner
- **Supersedes for now:** the email-OTP client flow in ADR-002 (the backend JWT verification is unchanged)

## Context

The app initially used Supabase email OTP (6 digits). Delivering the code requires
configuring a custom SMTP provider and changing the Supabase **Magic Link** email
template to include `{{ .Token }}`. The owner has not set up SMTP yet and asked for
a working signup/login flow now.

## Decision

Use Supabase **email + password** authentication in the current build:

- Client: `supabase.auth.signUp({ email, password })` and
  `supabase.auth.signInWithPassword({ email, password })`.
- Disable **Confirm email** in Supabase (Authentication → Providers → Email) so
  `signUp` returns a session immediately. `scripts/configure_supabase_auth.py`
  can set `mailer_autoconfirm` with a Management API token.
- FastAPI continues to verify the Supabase JWT via JWKS; no backend auth change.
- The app enforces a minimum password length of 6 and does not store passwords.
- Email OTP and phone OTP remain deferred.

## Consequences

- New users can create an account and sign in immediately without SMTP.
- Existing users created via OTP have **no password**. They must use a new email
  or a password-reset flow (which needs SMTP).
- Disabling email confirmation means unverified email addresses can register.
  This is acceptable for the current development build, not for production.
- Password reset and email verification are not implemented; they require SMTP
  and email templates.
- Production should revisit this decision: enable email verification and either
  keep password auth with reset, or return to OTP once SMTP is configured.
- Supabase handles password hashing and rate limits; no password is sent to the
  Argus backend or stored in application tables.
