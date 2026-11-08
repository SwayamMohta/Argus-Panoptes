from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Area(Base):
    """Hyderabad (GHMC) ward polygon and its administrative labels."""

    __tablename__ = "areas"
    __table_args__ = (
        UniqueConstraint("name", name="uq_areas_name"),
        Index("ix_areas_geom", "geom", postgresql_using="gist"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    zone: Mapped[str | None] = mapped_column(String(100))
    circle: Mapped[str | None] = mapped_column(String(100))
    geom: Mapped[Any] = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=False), nullable=False
    )


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str] = mapped_column(String(50), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    bg_color: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    status_label: Mapped[str] = mapped_column(String(50), nullable=False)
    compliance_score: Mapped[int] = mapped_column(Integer, nullable=False)
    active_assets_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_audited_days_ago: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    avoided_cost_inr: Mapped[int | None] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    checkpoints: Mapped[list["CategoryCheckpoint"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="CategoryCheckpoint.sort_order",
    )


class CategoryCheckpoint(Base):
    __tablename__ = "category_checkpoints"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    category_id: Mapped[str] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    category: Mapped[Category] = relationship(back_populates="checkpoints")


class ServiceStandard(Base):
    __tablename__ = "service_standards"
    __table_args__ = (CheckConstraint("standard_hours > 0", name="standard_hours_positive"),)

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    service: Mapped[str] = mapped_column(String(150), nullable=False)
    standard_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    authority: Mapped[str] = mapped_column(String(150), nullable=False)
    is_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Notice(Base, TimestampMixin):
    __tablename__ = "notices"
    __table_args__ = (
        CheckConstraint(
            "category IN ('water','roads','power','weather','infrastructure')",
            name="category",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    category_label: Mapped[str] = mapped_column(String(100), nullable=False)
    source: Mapped[str] = mapped_column(String(150), nullable=False)
    published_on: Mapped[date] = mapped_column(Date, nullable=False)
    expires_on: Mapped[date | None] = mapped_column(Date)
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    impact: Mapped[str | None] = mapped_column(Text)
    contact_helpline: Mapped[str | None] = mapped_column(String(50))
    locality_text: Mapped[str | None] = mapped_column(String(200))
