from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.base import APIModel
from app.schemas.issues import IssueOut

NOTICE_CATEGORIES = ("water", "roads", "power", "weather", "infrastructure")


class IssueStatusUpdate(APIModel):
    status: Literal["reported", "under_review", "in_progress", "resolved"]
    description: str | None = Field(None, max_length=500)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("description must not be blank")
        return value


class ResolutionImageIn(APIModel):
    path: str = Field(min_length=1, max_length=500)


class AdminReportOut(IssueOut):
    author_id: UUID
    author_handle: str
    hidden_at: datetime | None
    hidden_reason: str | None


class AdminReportPage(APIModel):
    items: list[AdminReportOut]
    total: int
    page: int
    limit: int


class IssueModerationIn(APIModel):
    hidden: bool
    reason: str | None = Field(None, max_length=255)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("reason must not be blank")
        return value


class CommentModerationIn(APIModel):
    hidden: bool


class CommentModerationOut(APIModel):
    id: UUID
    issue_id: UUID
    hidden: bool


class RoleUpdate(APIModel):
    role: Literal["citizen", "official", "admin"]


class AdminUserOut(APIModel):
    id: UUID
    handle: str
    display_name: str
    role: str


class AuditLogOut(APIModel):
    id: int
    actor_id: UUID | None
    action: str
    entity_type: str
    entity_id: str
    details: dict[str, Any]
    created_at: datetime


class AuditLogPage(APIModel):
    items: list[AuditLogOut]
    total: int
    page: int
    limit: int


class NoticeCreate(APIModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,99}$")
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=5000)
    category: Literal["water", "roads", "power", "weather", "infrastructure"]
    category_label: str | None = Field(None, max_length=100)
    source: str = Field(min_length=1, max_length=150)
    published_on: date
    expires_on: date | None = None
    is_official: bool = True
    impact: str | None = None
    contact_helpline: str | None = Field(None, max_length=50)
    locality: str | None = Field(None, max_length=200)

    @model_validator(mode="after")
    def validate_expiry(self) -> "NoticeCreate":
        if self.expires_on is not None and self.expires_on < self.published_on:
            raise ValueError("expiresOn must not be before publishedOn")
        return self


class NoticeUpdate(APIModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    summary: str | None = Field(None, min_length=1, max_length=5000)
    category: Literal["water", "roads", "power", "weather", "infrastructure"] | None = None
    category_label: str | None = Field(None, max_length=100)
    source: str | None = Field(None, min_length=1, max_length=150)
    published_on: date | None = None
    expires_on: date | None = None
    is_official: bool | None = None
    impact: str | None = None
    contact_helpline: str | None = Field(None, max_length=50)
    locality: str | None = Field(None, max_length=200)
