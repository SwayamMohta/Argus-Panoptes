import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.base import APIModel

# Acceptance envelope around the GHMC KML coverage. Ward assignment still uses
# ST_Covers against the 155 KML polygons; points inside this envelope but outside
# every polygon are stored as `unmatched` (never guessed).
HYDERABAD_LAT_RANGE = (17.27, 17.60)
HYDERABAD_LON_RANGE = (78.22, 78.65)

_STATUS_LABELS = {
    "reported": "Reported",
    "under_review": "Under Review",
    "in_progress": "In Progress",
    "resolved": "Resolved",
}

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class Coordinate(APIModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class IssueCreate(APIModel):
    category_id: str
    title: str
    description: str
    location: str
    coordinates: Coordinate
    # Optional manual ward override. When supplied, the report is linked to this
    # ward and marked `manual`; the coordinates are still required and stored
    # privately. This lets users report an edge/KML-gap location without guessing.
    area_id: UUID | None = None
    is_anonymous: bool = False
    priority: Literal["standard", "urgent", "safety_hazard"] = "standard"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not 5 <= len(value) <= 100:
            raise ValueError("title must be 5-100 characters after trimming")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        value = value.strip()
        if not 1 <= len(value) <= 500:
            raise ValueError("description must be 1-500 characters after trimming")
        return value

    @field_validator("location")
    @classmethod
    def validate_location(cls, value: str) -> str:
        value = value.strip()
        if not 1 <= len(value) <= 255:
            raise ValueError("location must be 1-255 characters after trimming")
        return value

    @model_validator(mode="after")
    def validate_hyderabad_bounds(self) -> "IssueCreate":
        # A manual ward override lets the user submit from outside the automatic
        # envelope; the ward is explicit and marked `manual`.
        if self.area_id is not None:
            return self
        lat, lon = self.coordinates.lat, self.coordinates.lon
        if not (
            HYDERABAD_LAT_RANGE[0] <= lat <= HYDERABAD_LAT_RANGE[1]
            and HYDERABAD_LON_RANGE[0] <= lon <= HYDERABAD_LON_RANGE[1]
        ):
            raise ValueError("coordinates must be within the Hyderabad dataset bounds")
        return self


class TimelineStepOut(APIModel):
    key: str
    label: str
    date: datetime | None
    description: str
    completed: bool


class IssueOut(APIModel):
    id: UUID
    public_ref: str
    category_id: str
    title: str
    description: str
    location: str
    area_id: UUID | None
    area: str | None
    area_assignment_status: str
    author: str
    is_anonymous: bool
    image_path: str | None
    image_caption: str | None
    resolved_image_path: str | None
    status: str
    status_label: str
    priority: str
    is_urgent_hazard: bool
    upvotes: int
    user_vote: int
    confirmations_count: int
    user_confirmed: bool
    comments_count: int
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None


class IssueDetailOut(IssueOut):
    timeline: list[TimelineStepOut]


class IssuePage(APIModel):
    items: list[IssueOut]
    total: int
    page: int
    limit: int


class VoteIn(APIModel):
    direction: Literal[-1, 1]


class IssueVoteOut(APIModel):
    issue_id: UUID
    upvotes: int
    user_vote: int


class ConfirmationOut(APIModel):
    issue_id: UUID
    confirmations_count: int
    user_confirmed: bool


class CommentCreate(APIModel):
    text: str
    parent_comment_id: UUID | None = None
    is_anonymous: bool = False

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = _CONTROL_CHARS.sub("", value).strip()
        if not 1 <= len(value) <= 500:
            raise ValueError("text must be 1-500 characters after trimming")
        return value


class CommentOut(APIModel):
    id: UUID
    author: str
    is_anonymous: bool
    is_official: bool
    text: str
    upvotes: int
    user_vote: int
    depth: int
    created_at: datetime
    replies: list["CommentOut"] = Field(default_factory=list)


class CommentPage(APIModel):
    items: list[CommentOut]
    total: int
    page: int
    limit: int


class CommentVoteOut(APIModel):
    comment_id: UUID
    upvotes: int
    user_vote: int


def status_label(status: str) -> str:
    return _STATUS_LABELS[status]
