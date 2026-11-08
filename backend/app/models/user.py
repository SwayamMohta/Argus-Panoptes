from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.reference import TimestampMixin


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint("role IN ('citizen','official','admin')", name="role"),
        CheckConstraint("avatar_type IN ('preset','image')", name="avatar_type"),
        CheckConstraint("pincode ~ '^[0-9]{6}$' OR pincode IS NULL", name="pincode"),
    )

    # Supabase Auth `sub`. No local auth.users table exists, so no FK here.
    id: Mapped[UUID] = mapped_column(primary_key=True)
    handle: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="citizen")
    address: Mapped[str | None] = mapped_column(String(255))
    area: Mapped[str | None] = mapped_column(String(150))
    city: Mapped[str | None] = mapped_column(String(150))
    state: Mapped[str | None] = mapped_column(String(150))
    pincode: Mapped[str | None] = mapped_column(String(6))
    avatar_type: Mapped[str] = mapped_column(String(20), nullable=False, default="preset")
    avatar_icon: Mapped[str | None] = mapped_column(String(50))
    avatar_icon_color: Mapped[str | None] = mapped_column(String(20))
    avatar_bg: Mapped[str | None] = mapped_column(String(20))
    avatar_path: Mapped[str | None] = mapped_column(Text)
    banner_theme: Mapped[str] = mapped_column(String(50), nullable=False, default="civicGreen")
    score_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("100.00")
    )
    digilocker_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserPreferences(Base, TimestampMixin):
    __tablename__ = "user_preferences"
    __table_args__ = (
        CheckConstraint("gps_masking_radius_m IN (250, 500, 1000)", name="gps_masking_radius_m"),
        CheckConstraint("theme_mode IN ('system','light','dark')", name="theme_mode"),
        CheckConstraint("lock_timeout IN ('immediate','1m','5m','15m')", name="lock_timeout"),
        CheckConstraint("language IN ('en','hi','te','kn','ta')", name="language"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    pseudonymous_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    home_radius_masking: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    gps_masking_radius_m: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=500)
    show_contact_on_rti: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    auto_sync_wifi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notification_channels: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {
            "statusChanges": True,
            "upvotesAndComments": True,
            "wardAlerts": True,
            "emergencyBroadcasts": True,
        },
    )
    theme_mode: Mapped[str] = mapped_column(String(10), nullable=False, default="system")
    is_app_lock_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    lock_timeout: Mapped[str] = mapped_column(String(10), nullable=False, default="5m")
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="en")
    auto_clear_cache: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
