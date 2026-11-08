"""Apply the documented retention policy.

Run from backend/:
    python -m scripts.retention_cleanup            # dry run
    python -m scripts.retention_cleanup --apply    # delete/overwrite

Policy (docs/engineering/privacy-retention.md):
- Admin audit rows are retained for 24 months.
- Soft-deleted comment text is overwritten after 30 days; the row stays so
  replies keep their parent.
"""

import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select, update

from app.db.session import SessionLocal
from app.models.admin import AdminAuditLog
from app.models.issue import Comment

AUDIT_RETENTION = timedelta(days=365 * 2)
COMMENT_RETENTION = timedelta(days=30)


def main(apply: bool) -> int:
    now = datetime.now(UTC)
    with SessionLocal() as db:
        old_audits = db.scalar(
            select(func.count())
            .select_from(AdminAuditLog)
            .where(AdminAuditLog.created_at < now - AUDIT_RETENTION)
        )
        old_comments = db.scalar(
            select(func.count())
            .select_from(Comment)
            .where(
                Comment.deleted_at.is_not(None),
                Comment.deleted_at < now - COMMENT_RETENTION,
                Comment.body != "[deleted]",
            )
        )
        print(f"audit rows older than 24 months: {old_audits}")
        print(f"deleted comments with text older than 30 days: {old_comments}")
        if not apply:
            print("dry run; pass --apply to execute")
            return 0
        db.execute(delete(AdminAuditLog).where(AdminAuditLog.created_at < now - AUDIT_RETENTION))
        db.execute(
            update(Comment)
            .where(
                Comment.deleted_at.is_not(None),
                Comment.deleted_at < now - COMMENT_RETENTION,
            )
            .values(body="[deleted]")
        )
        db.commit()
        print("retention cleanup applied")
        return 0


if __name__ == "__main__":
    raise SystemExit(main("--apply" in sys.argv))
