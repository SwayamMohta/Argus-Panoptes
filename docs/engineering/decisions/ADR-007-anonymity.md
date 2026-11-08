# ADR-007 — Anonymous reporting semantics

- **Status:** Accepted (2026-11-08; B-4 resolved as server-side pseudonymity)
- **Date:** 2026-11-08
- **Deciders:** Project owner

## Context

The frontend describes "zero-knowledge reporting" and "anonymous" reports. In code, the toggle only replaces the displayed author with "Anonymous Citizen"; the report remains in the same in-memory structure. The product also needs moderation and abuse prevention. True unlinkable anonymity and accountable moderation are in tension.

## Options considered

1. **Server-side pseudonymity: store `author_id`, never expose it publicly** (recommended)
2. Unlinkable anonymity: no author linkage for anonymous reports
3. Public anonymity with a separate encrypted identity escrow

## Decision

Use option 1 for the MVP.

- `issues.author_id` is required; `is_anonymous` controls the public projection.
- Public serializers return `author: "Anonymous Citizen"`, `authorBadge: "Anonymous"`, and no identifiers.
- Exact coordinates live only in the private location table.
- Moderators/admins can access authorship for abuse, legal, and safety handling, with an audit log.
- Do not describe the feature as zero-knowledge. Use "pseudonymous reporting" or "identity hidden from the public."
- Preferences (`pseudonymous_mode`) hide the handle on otherwise attributed reports; this is separate from full author hiding. *Phase 3 implements full author hiding via `is_anonymous`; `pseudonymous_mode` projection is not applied yet.*

## Rationale

- Preserves moderation, rate limiting, duplicate detection, and legal response capability.
- Matches what the current UI actually does.
- Avoids overpromising a security property the system does not provide.
- Keeps the schema simple and reversible: making `author_id` nullable later is straightforward; recovering a discarded link is not.

## Consequences

- Users are not truly unlinkable to the operator. This must be stated in the privacy notice.
- Admin access to anonymity must be logged and restricted.
- If unlinkable anonymity becomes a hard requirement, it needs a separate design (option 2/3) with different abuse controls.
- Rate limiting remains possible because the author is known server-side.

## Open questions

- Confirm that server-side pseudonymity is acceptable for the product/legal posture.
- Decide the retention period for authorship and exact coordinates.
- Decide whether moderators or only admins may unmask authorship.
