from typing import Literal

from pydantic import Field

from app.schemas.base import APIModel


class UploadUrlIn(APIModel):
    kind: Literal["evidence", "avatar"]
    content_type: Literal["image/jpeg", "image/png", "image/webp"]
    size_bytes: int = Field(gt=0)


class UploadUrlOut(APIModel):
    bucket: str
    path: str
    token: str
    upload_url: str


class AttachImageIn(APIModel):
    path: str = Field(min_length=1, max_length=500)
    caption: str | None = Field(None, max_length=200)


class AvatarIn(APIModel):
    path: str = Field(min_length=1, max_length=500)


class SignedUrlOut(APIModel):
    url: str
