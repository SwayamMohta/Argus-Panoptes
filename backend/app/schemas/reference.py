from datetime import date
from uuid import UUID

from pydantic import Field, computed_field

from app.schemas.base import APIModel


class CheckpointOut(APIModel):
    id: str
    title: str
    desc: str = Field(validation_alias="description")
    is_critical: bool


class CategoryOut(APIModel):
    id: str
    name: str
    short_name: str
    icon: str
    color: str
    bg_color: str
    status: str
    status_label: str
    compliance_score: int
    active_assets_count: int
    last_audited_days_ago: int | None
    description: str
    checkpoints: list[CheckpointOut]


class NoticeOut(APIModel):
    id: str
    title: str
    summary: str
    locality: str | None = Field(validation_alias="locality_text")
    category: str
    category_label: str
    source: str
    published_date: date = Field(validation_alias="published_on")
    expiry_date: date | None = Field(validation_alias="expires_on")
    is_official: bool
    impact: str | None
    contact_helpline: str | None


class ServiceStandardOut(APIModel):
    id: str
    service: str
    standard_hours: int
    authority: str
    critical: bool = Field(validation_alias="is_critical")

    @computed_field
    @property
    def standard(self) -> str:
        return f"{self.standard_hours} Hours"


class AreaOut(APIModel):
    id: UUID
    name: str


class NearestAreaOut(APIModel):
    area: AreaOut
    distance_m: float


class WardCenter(APIModel):
    lat: float
    lon: float


class WardOut(APIModel):
    id: UUID
    name: str
    zone: str | None
    circle: str | None
    center: WardCenter


class WardDetailOut(WardOut):
    geometry: dict[str, object]


class AreaLookupOut(APIModel):
    status: str
    area: AreaOut | None
    candidates: list[AreaOut]


class HealthOut(APIModel):
    status: str
    database: str
    environment: str
