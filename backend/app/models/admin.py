from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AdminAuditLog(Base):
    """Append-only record of privileged actions (officials and admins)."""

    __tablename__ = "admin_audit_log"
    __table_args__ = (
        Index("ix_admin_audit_log_created", "created_at"),
        Index("ix_admin_audit_log_actor", "actor_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
