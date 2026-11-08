"""add manual area assignment status

Revision ID: b4f6a2c81d37
Revises: f127b8b90639
Create Date: 2026-11-09

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b4f6a2c81d37"
down_revision: str | Sequence[str] | None = "f127b8b90639"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OLD = "area_assignment_status IN ('matched','unmatched','ambiguous')"
NEW = "area_assignment_status IN ('matched','unmatched','ambiguous','manual')"


def upgrade() -> None:
    op.execute("ALTER TABLE issues DROP CONSTRAINT ck_issues_area_assignment_status")
    op.execute(f"ALTER TABLE issues ADD CONSTRAINT ck_issues_area_assignment_status CHECK ({NEW})")


def downgrade() -> None:
    op.execute(
        "UPDATE issues SET area_assignment_status = 'unmatched' "
        "WHERE area_assignment_status = 'manual'"
    )
    op.execute("ALTER TABLE issues DROP CONSTRAINT ck_issues_area_assignment_status")
    op.execute(f"ALTER TABLE issues ADD CONSTRAINT ck_issues_area_assignment_status CHECK ({OLD})")
