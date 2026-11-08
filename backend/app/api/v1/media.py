from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException

from app.api.deps import AccessToken, CurrentUser, DbSession, StorageDep
from app.core.config import get_settings
from app.schemas.issues import IssueDetailOut
from app.schemas.media import AttachImageIn, AvatarIn, SignedUrlOut, UploadUrlIn, UploadUrlOut
from app.schemas.users import ProfileOut
from app.services.issues import get_visible_issue, to_detail_out
from app.services.storage import ALLOWED_IMAGE_TYPES, require_owned_image

router = APIRouter(tags=["media"])


@router.post("/media/upload-url", response_model=UploadUrlOut)
def create_upload_url(
    payload: UploadUrlIn,
    user: CurrentUser,
    access_token: AccessToken,
    storage: StorageDep,
):
    settings = get_settings()
    if payload.size_bytes > settings.max_image_bytes:
        raise HTTPException(
            status_code=422,
            detail=f"Images must be at most {settings.max_image_bytes} bytes",
        )
    extension = ALLOWED_IMAGE_TYPES[payload.content_type]
    bucket = settings.avatar_bucket if payload.kind == "avatar" else settings.evidence_bucket
    path = f"{user.id}/{uuid4().hex}.{extension}"

    signed = storage.create_signed_upload_url(bucket, path, access_token)
    return UploadUrlOut(
        bucket=signed.bucket,
        path=signed.path,
        token=signed.token,
        upload_url=signed.upload_url,
    )


@router.post("/issues/{issue_id}/image", response_model=IssueDetailOut)
def attach_issue_image(
    issue_id: UUID,
    payload: AttachImageIn,
    user: CurrentUser,
    access_token: AccessToken,
    db: DbSession,
    storage: StorageDep,
):
    issue = get_visible_issue(db, issue_id)
    if issue.author_id != user.id:
        raise HTTPException(status_code=403, detail="Only the author can attach evidence")

    settings = get_settings()
    require_owned_image(
        storage,
        access_token,
        settings.evidence_bucket,
        payload.path,
        user.id,
    )
    issue.image_path = payload.path
    issue.image_caption = payload.caption
    db.commit()
    return to_detail_out(db, issue, user)


@router.post("/users/me/avatar", response_model=ProfileOut)
def attach_avatar(
    payload: AvatarIn,
    user: CurrentUser,
    access_token: AccessToken,
    db: DbSession,
    storage: StorageDep,
):
    settings = get_settings()
    require_owned_image(storage, access_token, settings.avatar_bucket, payload.path, user.id)
    user.avatar_path = payload.path
    user.avatar_type = "image"
    db.commit()
    return user


@router.get("/issues/{issue_id}/image-url", response_model=SignedUrlOut)
def issue_image_url(
    issue_id: UUID,
    user: CurrentUser,
    access_token: AccessToken,
    db: DbSession,
    storage: StorageDep,
):
    issue = get_visible_issue(db, issue_id)
    if not issue.image_path:
        raise HTTPException(status_code=404, detail="Issue has no evidence image")

    settings = get_settings()
    url = storage.create_signed_url(
        settings.evidence_bucket,
        issue.image_path,
        access_token,
        settings.signed_url_ttl_seconds,
    )
    return SignedUrlOut(url=url)
