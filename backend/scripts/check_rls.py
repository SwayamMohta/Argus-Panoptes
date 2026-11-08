"""Verify that Row Level Security is enabled on every application table.

Run from backend/ against the migrated database:
    python -m scripts.check_rls
"""

import sys

from sqlalchemy import text

from app.db.session import SessionLocal

TABLES = (
    "areas",
    "categories",
    "category_checkpoints",
    "notices",
    "service_standards",
    "profiles",
    "user_preferences",
    "issues",
    "issue_private_locations",
    "issue_events",
    "issue_votes",
    "issue_confirmations",
    "comments",
    "comment_votes",
    "favorite_places",
    "sla_escalations",
    "admin_audit_log",
)


def main() -> int:
    with SessionLocal() as db:
        rows = db.execute(
            text(
                """
                SELECT c.relname, c.relrowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relname = ANY(:tables)
                """
            ),
            {"tables": list(TABLES)},
        ).all()
    state = {row.relname: row.relrowsecurity for row in rows}
    missing = [table for table in TABLES if not state.get(table)]
    for table in TABLES:
        print(f"{'ON ' if state.get(table) else 'OFF'} {table}")
    if missing:
        print(f"RLS disabled on: {', '.join(missing)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
