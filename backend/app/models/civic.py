from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FavoritePlace(Base):
    """A ward or point the caller monitors. Always private to its owner."""

    __tablename__ = "favorite_places"
    __table_args__ = (
        UniqueConstraint("user_id", "area_id", name="uq_favorite_places_user_area"),
        Index("ix_favorite_places_user_created", "user_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    area_id: Mapped[UUID | None] = mapped_column(ForeignKey("areas.id", ondelete="SET NULL"))
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    geom: Mapped[Any | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False)
    )
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SlaEscalation(Base):
    __tablename__ = "sla_escalations"
    __table_args__ = (
        CheckConstraint("status IN ('queued','acknowledged','closed')", name="status"),
        UniqueConstraint(
            "user_id",
            "issue_id",
            "service_standard_id",
            name="uq_sla_escalations_user_issue_standard",
        ),
        Index("ix_sla_escalations_user_created", "user_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    issue_id: Mapped[UUID | None] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"))
    service_standard_id: Mapped[str] = mapped_column(
        ForeignKey("service_standards.id"), nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
