from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from geoalchemy2 import Geography
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.reference import TimestampMixin

ISSUE_STATUS_ORDER = ("reported", "under_review", "in_progress", "resolved")


class Issue(Base, TimestampMixin):
    __tablename__ = "issues"
    __table_args__ = (
        CheckConstraint(
            "status IN ('reported','under_review','in_progress','resolved')", name="status"
        ),
        CheckConstraint("priority IN ('standard','urgent','safety_hazard')", name="priority"),
        CheckConstraint(
            "area_assignment_status IN ('matched','unmatched','ambiguous','manual')",
            name="area_assignment_status",
        ),
        CheckConstraint("char_length(btrim(title)) BETWEEN 5 AND 100", name="title_length"),
        CheckConstraint(
            "char_length(btrim(description)) BETWEEN 1 AND 500", name="description_length"
        ),
        CheckConstraint("confirmations_count >= 0", name="confirmations_count_non_negative"),
        CheckConstraint("comments_count >= 0", name="comments_count_non_negative"),
        Index("ix_issues_category_created", "category_id", "created_at"),
        Index("ix_issues_status_created", "status", "created_at"),
        Index("ix_issues_area_created", "area_id", "created_at"),
        Index("ix_issues_area_assignment_status", "area_assignment_status"),
        Index("ix_issues_author_created", "author_id", "created_at"),
        Index("ix_issues_geom", "geom", postgresql_using="gist"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    public_ref: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"), nullable=False)
    area_id: Mapped[UUID | None] = mapped_column(ForeignKey("areas.id"))
    area_assignment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unmatched"
    )
    area_assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    author_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    location_text: Mapped[str] = mapped_column(String(255), nullable=False)
    geom: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    is_geom_masked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    image_path: Mapped[str | None] = mapped_column(Text)
    image_caption: Mapped[str | None] = mapped_column(String(200))
    resolved_image_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="reported")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="standard")
    is_urgent_hazard: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    vote_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confirmations_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hidden_reason: Mapped[str | None] = mapped_column(String(255))


class IssuePrivateLocation(Base):
    """Exact coordinates. Never selected by a public serializer."""

    __tablename__ = "issue_private_locations"

    issue_id: Mapped[UUID] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True
    )
    exact_geom: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    original_lat: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    original_lon: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IssueEvent(Base):
    __tablename__ = "issue_events"
    __table_args__ = (
        CheckConstraint(
            "status IN ('reported','under_review','in_progress','resolved')", name="status"
        ),
        Index("ix_issue_events_issue_time", "issue_id", "occurred_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    issue_id: Mapped[UUID] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IssueVote(Base):
    __tablename__ = "issue_votes"
    __table_args__ = (CheckConstraint("direction IN (-1, 1)", name="direction"),)

    issue_id: Mapped[UUID] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    direction: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IssueConfirmation(Base):
    __tablename__ = "issue_confirmations"

    issue_id: Mapped[UUID] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    confirmed_geom: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    distance_m: Mapped[Decimal | None] = mapped_column(Numeric)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Comment(Base, TimestampMixin):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint("char_length(btrim(body)) BETWEEN 1 AND 500", name="body_length"),
        CheckConstraint("depth BETWEEN 0 AND 3", name="depth_range"),
        Index("ix_comments_issue_created", "issue_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    issue_id: Mapped[UUID] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[UUID | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"))
    author_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    body: Mapped[str] = mapped_column(String(500), nullable=False)
    depth: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    vote_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CommentVote(Base):
    __tablename__ = "comment_votes"
    __table_args__ = (CheckConstraint("direction IN (-1, 1)", name="direction"),)

    comment_id: Mapped[UUID] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    direction: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
