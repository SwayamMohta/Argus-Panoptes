from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select

from app.api.deps import (
    AccessToken,
    CurrentUser,
    DbSession,
    OfficialUser,
    OptionalUser,
    StorageDep,
)
from app.core.config import get_settings
from app.models.issue import (
    ISSUE_STATUS_ORDER,
    Issue,
    IssueConfirmation,
    IssueEvent,
    IssuePrivateLocation,
    IssueVote,
)
from app.models.reference import Area, Category
from app.models.user import Profile
from app.schemas.admin import IssueStatusUpdate, ResolutionImageIn
from app.schemas.issues import (
    CommentCreate,
    CommentOut,
    CommentPage,
    CommentVoteOut,
    ConfirmationOut,
    Coordinate,
    IssueCreate,
    IssueDetailOut,
    IssuePage,
    IssueVoteOut,
    VoteIn,
)
from app.schemas.media import SignedUrlOut
from app.services.admin import log_audit
from app.services.issues import (
    comment_tree,
    create_comment,
    derive_area,
    get_visible_issue,
    lock_issue,
    new_public_ref,
    point,
    set_comment_vote,
    set_confirmation,
    set_issue_vote,
    to_detail_out,
    to_issue_out,
)
from app.services.ratelimit import enforce_issue_creation
from app.services.storage import require_owned_image

router = APIRouter(tags=["issues"])


@router.post("/issues", response_model=IssueDetailOut, status_code=201)
def create_issue(payload: IssueCreate, user: CurrentUser, db: DbSession):
    if db.get(Category, payload.category_id) is None:
        raise HTTPException(status_code=422, detail="Unknown category")
    enforce_issue_creation(user.id)

    lat, lon = payload.coordinates.lat, payload.coordinates.lon
    if payload.area_id is not None:
        area = db.get(Area, payload.area_id)
        if area is None:
            raise HTTPException(status_code=422, detail="Unknown area")
        area_id, assignment_status = area.id, "manual"
    else:
        area_id, assignment_status, _ = derive_area(db, lat, lon)
    geom = point(lat, lon)
    issue = Issue(
        public_ref=new_public_ref(db, payload.category_id),
        category_id=payload.category_id,
        area_id=area_id,
        area_assignment_status=assignment_status,
        area_assigned_at=datetime.now(UTC) if area_id else None,
        author_id=user.id,
        is_anonymous=payload.is_anonymous,
        title=payload.title,
        description=payload.description,
        location_text=payload.location,
        geom=geom,
        status="reported",
        priority=payload.priority,
        is_urgent_hazard=payload.priority == "safety_hazard",
        vote_score=1,
    )
    db.add(issue)
    db.flush()
    db.add(
        IssuePrivateLocation(
            issue_id=issue.id,
            exact_geom=geom,
            original_lat=Decimal(str(lat)),
            original_lon=Decimal(str(lon)),
        )
    )
    db.add(IssueVote(issue_id=issue.id, user_id=user.id, direction=1))
    db.add(
        IssueEvent(
            issue_id=issue.id,
            status="reported",
            description="Citizen report filed.",
            actor_id=user.id,
        )
    )
    db.commit()
    return to_detail_out(db, issue, user)


@router.get("/issues", response_model=IssuePage)
def list_issues(
    db: DbSession,
    user: OptionalUser,
    category_id: str | None = Query(None, alias="categoryId"),
    status: str | None = None,
    area_id: UUID | None = Query(None, alias="areaId"),
    area_assignment_status: str | None = Query(None, alias="areaAssignmentStatus"),
    author_handle: str | None = Query(None, alias="authorHandle"),
    q: str | None = None,
    bbox: str | None = None,
    near: str | None = None,
    radius_m: float | None = Query(None, alias="radiusM", gt=0, le=50_000),
    is_urgent: bool | None = Query(None, alias="isUrgent"),
    sort_by: Literal["trending", "new", "top", "resolved"] = Query("trending", alias="sortBy"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    filters = [Issue.hidden_at.is_(None)]
    if category_id:
        filters.append(Issue.category_id == category_id)
    if status:
        filters.append(Issue.status == status)
    if area_id:
        filters.append(Issue.area_id == area_id)
    if area_assignment_status:
        filters.append(Issue.area_assignment_status == area_assignment_status)
    if author_handle:
        filters.append(Profile.handle == author_handle)
    if q:
        pattern = f"%{q}%"
        filters.append(
            or_(
                Issue.title.ilike(pattern),
                Issue.description.ilike(pattern),
                Issue.location_text.ilike(pattern),
            )
        )
    if is_urgent is not None:
        filters.append(Issue.is_urgent_hazard == is_urgent)
    if bbox:
        filters.append(func.ST_Intersects(Issue.geom, func.ST_GeogFromText(_bbox_polygon(bbox))))
    if near:
        lat, lon = _parse_point(near)
        if radius_m is None:
            raise HTTPException(status_code=422, detail="radiusM is required with near")
        filters.append(
            func.ST_DWithin(Issue.geom, func.ST_GeogFromText(f"POINT({lon} {lat})"), radius_m)
        )
    if sort_by == "resolved":
        filters.append(Issue.status == "resolved")

    base = (
        select(Issue, Area.name, Profile.handle)
        .outerjoin(Area, Issue.area_id == Area.id)
        .outerjoin(Profile, Issue.author_id == Profile.id)
        .where(*filters)
    )
    total = db.scalar(
        select(func.count()).select_from(
            select(Issue.id)
            .outerjoin(Area, Issue.area_id == Area.id)
            .outerjoin(Profile, Issue.author_id == Profile.id)
            .where(*filters)
            .subquery()
        )
    )
    rows = db.execute(
        base.order_by(*_order_by(sort_by)).offset((page - 1) * limit).limit(limit)
    ).all()

    ids = [issue.id for issue, _, _ in rows]
    user_votes: dict[UUID, int] = {}
    confirmed: set[UUID] = set()
    if user is not None and ids:
        user_votes = dict(
            db.execute(
                select(IssueVote.issue_id, IssueVote.direction).where(
                    IssueVote.user_id == user.id, IssueVote.issue_id.in_(ids)
                )
            ).all()
        )
        confirmed = set(
            db.scalars(
                select(IssueConfirmation.issue_id).where(
                    IssueConfirmation.user_id == user.id,
                    IssueConfirmation.issue_id.in_(ids),
                )
            ).all()
        )

    return IssuePage(
        items=[
            to_issue_out(
                issue,
                area_name,
                handle,
                user_votes.get(issue.id, 0),
                issue.id in confirmed,
            )
            for issue, area_name, handle in rows
        ],
        total=total or 0,
        page=page,
        limit=limit,
    )


@router.get("/issues/{issue_id}", response_model=IssueDetailOut)
def get_issue(issue_id: UUID, db: DbSession, user: OptionalUser):
    return to_detail_out(db, get_visible_issue(db, issue_id), user)


@router.post("/issues/{issue_id}/status", response_model=IssueDetailOut)
def advance_issue_status(
    issue_id: UUID, payload: IssueStatusUpdate, user: OfficialUser, db: DbSession
):
    issue = get_visible_issue(db, issue_id, with_for_update=True)
    previous = issue.status
    if ISSUE_STATUS_ORDER.index(payload.status) <= ISSUE_STATUS_ORDER.index(previous):
        raise HTTPException(status_code=422, detail="Status must advance to a later step")

    issue.status = payload.status
    if payload.status == "resolved":
        issue.resolved_at = datetime.now(UTC)
    db.add(
        IssueEvent(
            issue_id=issue.id,
            status=payload.status,
            description=payload.description or f"Status advanced to {payload.status}.",
            actor_id=user.id,
        )
    )
    log_audit(db, user, "issue.status", "issue", issue.id, {"from": previous, "to": payload.status})
    db.commit()
    return to_detail_out(db, issue, user)


@router.post("/issues/{issue_id}/resolution-image", response_model=IssueDetailOut)
def attach_resolution_image(
    issue_id: UUID,
    payload: ResolutionImageIn,
    user: OfficialUser,
    access_token: AccessToken,
    db: DbSession,
    storage: StorageDep,
):
    issue = get_visible_issue(db, issue_id)
    if issue.status != "resolved":
        raise HTTPException(status_code=422, detail="Issue must be resolved first")

    settings = get_settings()
    require_owned_image(storage, access_token, settings.evidence_bucket, payload.path, user.id)
    issue.resolved_image_path = payload.path
    log_audit(db, user, "issue.resolution_image", "issue", issue.id, {"path": payload.path})
    db.commit()
    return to_detail_out(db, issue, user)


@router.get("/issues/{issue_id}/resolution-image-url", response_model=SignedUrlOut)
def resolution_image_url(
    issue_id: UUID,
    user: CurrentUser,
    access_token: AccessToken,
    db: DbSession,
    storage: StorageDep,
):
    issue = get_visible_issue(db, issue_id)
    if not issue.resolved_image_path:
        raise HTTPException(status_code=404, detail="Issue has no resolution image")

    settings = get_settings()
    url = storage.create_signed_url(
        settings.evidence_bucket,
        issue.resolved_image_path,
        access_token,
        settings.signed_url_ttl_seconds,
    )
    return SignedUrlOut(url=url)


@router.post("/issues/{issue_id}/vote", response_model=IssueVoteOut)
def vote_issue(issue_id: UUID, payload: VoteIn, user: CurrentUser, db: DbSession):
    upvotes, user_vote = set_issue_vote(db, issue_id, user.id, payload.direction)
    return IssueVoteOut(issue_id=issue_id, upvotes=upvotes, user_vote=user_vote)


@router.post("/issues/{issue_id}/confirm", response_model=ConfirmationOut)
def confirm_issue(issue_id: UUID, payload: Coordinate, user: CurrentUser, db: DbSession):
    count, confirmed = set_confirmation(db, issue_id, user.id, payload.lat, payload.lon)
    return ConfirmationOut(issue_id=issue_id, confirmations_count=count, user_confirmed=confirmed)


@router.get("/issues/{issue_id}/comments", response_model=CommentPage)
def get_comments(
    issue_id: UUID,
    db: DbSession,
    user: OptionalUser,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    get_visible_issue(db, issue_id)
    return comment_tree(db, issue_id, user, page, limit)


@router.post("/issues/{issue_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(issue_id: UUID, payload: CommentCreate, user: CurrentUser, db: DbSession):
    issue = lock_issue(db, issue_id)
    comment = create_comment(
        db, issue, user, payload.text, payload.parent_comment_id, payload.is_anonymous
    )
    return CommentOut(
        id=comment.id,
        author="Anonymous Citizen" if comment.is_anonymous else user.handle,
        is_anonymous=comment.is_anonymous,
        is_official=comment.is_official,
        text=comment.body,
        upvotes=0,
        user_vote=0,
        depth=comment.depth,
        created_at=comment.created_at,
    )


@router.post("/comments/{comment_id}/vote", response_model=CommentVoteOut)
def vote_comment(comment_id: UUID, payload: VoteIn, user: CurrentUser, db: DbSession):
    upvotes, user_vote = set_comment_vote(db, comment_id, user.id, payload.direction)
    return CommentVoteOut(comment_id=comment_id, upvotes=upvotes, user_vote=user_vote)


def _parse_point(value: str) -> tuple[float, float]:
    parts = value.split(",")
    if len(parts) != 2:
        raise HTTPException(status_code=422, detail="near must be 'lat,lon'")
    try:
        lat, lon = float(parts[0]), float(parts[1])
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="near must be 'lat,lon'") from exc
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise HTTPException(status_code=422, detail="near coordinates are out of range")
    return lat, lon


def _bbox_polygon(value: str) -> str:
    parts = value.split(",")
    if len(parts) != 4:
        raise HTTPException(status_code=422, detail="bbox must be 'minLon,minLat,maxLon,maxLat'")
    try:
        min_lon, min_lat, max_lon, max_lat = (float(part) for part in parts)
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail="bbox must be 'minLon,minLat,maxLon,maxLat'"
        ) from exc
    return (
        f"POLYGON(({min_lon} {min_lat},{max_lon} {min_lat},{max_lon} {max_lat},"
        f"{min_lon} {max_lat},{min_lon} {min_lat}))"
    )


def _order_by(sort_by: str):
    if sort_by == "new":
        return (Issue.created_at.desc(), Issue.id.desc())
    if sort_by == "top":
        return (func.greatest(Issue.vote_score, 0).desc(), Issue.created_at.desc())
    if sort_by == "resolved":
        return (Issue.resolved_at.desc(), Issue.created_at.desc())
    return (
        (Issue.vote_score * 1.5 + Issue.comments_count * 2).desc(),
        Issue.created_at.desc(),
    )
