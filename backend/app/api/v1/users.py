from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import delete, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models.civic import FavoritePlace, SlaEscalation
from app.models.issue import Comment, CommentVote, Issue, IssueConfirmation, IssueVote
from app.models.user import UserPreferences
from app.schemas.users import PreferencesIn, PreferencesOut, ProfileOut, ProfileUpdate
from app.services.admin import log_audit

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=ProfileOut)
def read_me(user: CurrentUser):
    return user


@router.patch("/me", response_model=ProfileOut)
def update_me(payload: ProfileUpdate, user: CurrentUser, db: DbSession):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Handle or contact detail already in use"
        ) from exc
    return user


@router.get("/me/preferences", response_model=PreferencesOut)
def read_preferences(user: CurrentUser, db: DbSession):
    return _preferences(db, user.id)


# PUT and PATCH intentionally share partial-update semantics; only supplied fields change.
@router.put("/me/preferences", response_model=PreferencesOut)
@router.patch("/me/preferences", response_model=PreferencesOut)
def update_preferences(payload: PreferencesIn, user: CurrentUser, db: DbSession):
    preferences = _preferences(db, user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(preferences, field, value)
    db.commit()
    return preferences


@router.delete("/me", status_code=204)
def delete_me(user: CurrentUser, db: DbSession):
    """Anonymize the account and remove personal artifacts.

    Civic reports are retained as anonymous civic records; comments stay in the
    thread but are anonymized. Votes, confirmations, favorites, escalations, and
    preferences are removed.
    """
    user_id = user.id
    db.execute(delete(FavoritePlace).where(FavoritePlace.user_id == user_id))
    db.execute(delete(SlaEscalation).where(SlaEscalation.user_id == user_id))
    db.execute(delete(IssueVote).where(IssueVote.user_id == user_id))
    db.execute(delete(IssueConfirmation).where(IssueConfirmation.user_id == user_id))
    db.execute(delete(CommentVote).where(CommentVote.user_id == user_id))
    db.execute(delete(UserPreferences).where(UserPreferences.user_id == user_id))
    db.execute(update(Comment).where(Comment.author_id == user_id).values(is_anonymous=True))
    db.execute(update(Issue).where(Issue.author_id == user_id).values(is_anonymous=True))

    user.handle = f"deleted_{user_id.hex[:12]}"
    user.display_name = "Deleted Citizen"
    user.email = None
    user.phone = None
    user.role = "citizen"
    user.address = None
    user.area = None
    user.city = None
    user.state = None
    user.pincode = None
    user.avatar_type = "preset"
    user.avatar_icon = "user"
    user.avatar_icon_color = "#2A3036"
    user.avatar_bg = "#EDEFF0"
    user.avatar_path = None
    user.digilocker_verified = False
    user.deleted_at = datetime.now(UTC)
    log_audit(db, user, "user.delete", "profile", user_id)
    db.commit()
    return Response(status_code=204)


def _preferences(db: Session, user_id: UUID) -> UserPreferences:
    preferences = db.get(UserPreferences, user_id)
    if preferences is None:
        preferences = UserPreferences(user_id=user_id)
        db.add(preferences)
        db.commit()
    return preferences
