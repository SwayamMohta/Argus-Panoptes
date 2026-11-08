from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.base import APIModel


class ProfileOut(APIModel):
    id: UUID
    handle: str
    display_name: str
    email: str | None
    phone: str | None
    role: str
    address: str | None
    area: str | None
    city: str | None
    state: str | None
    pincode: str | None
    avatar_type: str
    avatar_icon: str | None
    avatar_icon_color: str | None
    avatar_bg: str | None
    avatar_path: str | None
    banner_theme: str
    score_percentage: float
    digilocker_verified: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdate(APIModel):
    handle: str | None = Field(None, min_length=3, max_length=50, pattern=r"^[a-z0-9_]+$")
    display_name: str | None = Field(None, min_length=1, max_length=150)
    address: str | None = Field(None, max_length=255)
    area: str | None = Field(None, max_length=150)
    city: str | None = Field(None, max_length=150)
    state: str | None = Field(None, max_length=150)
    pincode: str | None = Field(None, pattern=r"^[0-9]{6}$")
    avatar_type: Literal["preset", "image"] | None = None
    avatar_icon: str | None = Field(None, max_length=50)
    avatar_icon_color: str | None = Field(None, max_length=20)
    avatar_bg: str | None = Field(None, max_length=20)
    banner_theme: str | None = Field(None, max_length=50)


class PreferencesOut(APIModel):
    pseudonymous_mode: bool
    home_radius_masking: bool
    gps_masking_radius_m: int
    show_contact_on_rti: bool
    auto_sync_wifi: bool
    notifications_enabled: bool
    notification_channels: dict[str, bool]
    theme_mode: str
    is_app_lock_enabled: bool
    lock_timeout: str
    language: str
    auto_clear_cache: bool


class PreferencesIn(APIModel):
    pseudonymous_mode: bool | None = None
    home_radius_masking: bool | None = None
    gps_masking_radius_m: Literal[250, 500, 1000] | None = None
    show_contact_on_rti: bool | None = None
    auto_sync_wifi: bool | None = None
    notifications_enabled: bool | None = None
    notification_channels: dict[str, bool] | None = None
    theme_mode: Literal["system", "light", "dark"] | None = None
    is_app_lock_enabled: bool | None = None
    lock_timeout: Literal["immediate", "1m", "5m", "15m"] | None = None
    language: Literal["en", "hi", "te", "kn", "ta"] | None = None
    auto_clear_cache: bool | None = None
