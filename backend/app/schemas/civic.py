from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.base import APIModel
from app.schemas.issues import HYDERABAD_LAT_RANGE, HYDERABAD_LON_RANGE, Coordinate, IssuePage


class AuditKpis(APIModel):
    total_logged: int
    reported: int
    under_review: int
    in_progress: int
    verified: int


class AuditsOut(IssuePage):
    kpis: AuditKpis


class SectorImpact(APIModel):
    category_id: str
    category: str
    value_inr: int
    resolved_count: int


class ImpactOut(APIModel):
    total_value_inr: int
    verified_count: int
    sector_breakdown: list[SectorImpact]


class FavoriteCreate(APIModel):
    label: str
    area_id: UUID | None = None
    coordinates: Coordinate | None = None
    pinned: bool = True

    @field_validator("label")
    @classmethod
    def validate_label(cls, value: str) -> str:
        value = value.strip()
        if not 1 <= len(value) <= 120:
            raise ValueError("label must be 1-120 characters after trimming")
        return value

    @model_validator(mode="after")
    def validate_location(self) -> "FavoriteCreate":
        if self.area_id is None and self.coordinates is None:
            raise ValueError("areaId or coordinates is required")
        if self.coordinates is None:
            return self
        lat, lon = self.coordinates.lat, self.coordinates.lon
        if not (
            HYDERABAD_LAT_RANGE[0] <= lat <= HYDERABAD_LAT_RANGE[1]
            and HYDERABAD_LON_RANGE[0] <= lon <= HYDERABAD_LON_RANGE[1]
        ):
            raise ValueError("coordinates must be within the Hyderabad dataset bounds")
        return self


class FavoriteUpdate(APIModel):
    label: str | None = None
    pinned: bool | None = None

    @field_validator("label")
    @classmethod
    def validate_label(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not 1 <= len(value) <= 120:
            raise ValueError("label must be 1-120 characters after trimming")
        return value


class FavoriteOut(APIModel):
    id: UUID
    label: str
    area_id: UUID | None
    area: str | None
    zone: str | None
    circle: str | None
    pinned: bool
    created_at: datetime


class SlaEscalationCreate(APIModel):
    service_standard_id: str
    issue_id: UUID | None = None
    note: str | None = Field(None, max_length=500)

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("note must not be blank")
        return value


class SlaEscalationOut(APIModel):
    id: UUID
    issue_id: UUID | None
    service_standard_id: str
    note: str | None
    status: str
    created_at: datetime
