import secrets
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.issue import (
    ISSUE_STATUS_ORDER,
    Comment,
    CommentVote,
    Issue,
    IssueConfirmation,
    IssueEvent,
    IssueVote,
)
from app.models.reference import Area
from app.models.user import Profile
from app.schemas.issues import (
    CommentOut,
    CommentPage,
    IssueDetailOut,
    IssueOut,
    TimelineStepOut,
    status_label,
)
from app.services.areas import find_areas_at

MAX_CONFIRMATION_DISTANCE_M = 2000

# ponytail: load at most this many comments per issue and paginate roots in Python.
COMMENT_LOAD_LIMIT = 1000

_STEP_DESCRIPTIONS = {
    "reported": "Citizen report filed.",
    "under_review": "Ward inspection and engineering review queued.",
    "in_progress": "Civic repair work in progress.",
    "resolved": "Repair completed and verified.",
}
_STEP_LABELS = {
    "reported": "Reported",
    "under_review": "Under Review",
    "in_progress": "In Progress",
    "resolved": "Resolved",
}


def point(lat: float, lon: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def derive_area(db: Session, lat: float, lon: float) -> tuple[UUID | None, str, str | None]:
    matches = find_areas_at(db, lat, lon)
    if len(matches) == 1:
        return matches[0].id, "matched", matches[0].name
    if matches:
        return None, "ambiguous", None
    return None, "unmatched", None


def new_public_ref(db: Session, category_id: str) -> str:
    prefix = category_id[:2].upper()
    year = datetime.now(UTC).year
    for _ in range(5):
        ref = f"REP-{prefix}-{year}-{secrets.token_hex(2).upper()}"
        if db.scalar(select(Issue.id).where(Issue.public_ref == ref)) is None:
            return ref
    return f"REP-{prefix}-{year}-{secrets.token_hex(4).upper()}"


def build_timeline(events: list[IssueEvent], current_status: str) -> list[TimelineStepOut]:
    current_index = ISSUE_STATUS_ORDER.index(current_status)
    by_status = {event.status: event for event in events}
    steps = []
    for index, key in enumerate(ISSUE_STATUS_ORDER):
        event = by_status.get(key)
        steps.append(
            TimelineStepOut(
                key=key,
                label=_STEP_LABELS[key],
                date=event.occurred_at if event else None,
                description=event.description if event else _STEP_DESCRIPTIONS[key],
                completed=index <= current_index,
            )
        )
    return steps


def to_issue_out(
    issue: Issue,
    area_name: str | None,
    author_handle: str | None,
    user_vote: int = 0,
    user_confirmed: bool = False,
) -> IssueOut:
    return IssueOut(
        id=issue.id,
        public_ref=issue.public_ref,
        category_id=issue.category_id,
        title=issue.title,
        description=issue.description,
        location=issue.location_text,
        area_id=issue.area_id,
        area=area_name,
        area_assignment_status=issue.area_assignment_status,
        author="Anonymous Citizen" if issue.is_anonymous else (author_handle or "Citizen"),
        is_anonymous=issue.is_anonymous,
        image_path=issue.image_path,
        image_caption=issue.image_caption,
        resolved_image_path=issue.resolved_image_path,
        status=issue.status,
        status_label=status_label(issue.status),
        priority=issue.priority,
        is_urgent_hazard=issue.is_urgent_hazard,
        upvotes=max(issue.vote_score, 0),
        user_vote=user_vote,
        confirmations_count=issue.confirmations_count,
        user_confirmed=user_confirmed,
        comments_count=issue.comments_count,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        resolved_at=issue.resolved_at,
    )


def to_detail_out(db: Session, issue: Issue, user: Profile | None) -> IssueDetailOut:
    area_name = db.get(Area, issue.area_id).name if issue.area_id else None
    author = db.get(Profile, issue.author_id)
    author_handle = author.handle if author else None
    user_vote = 0
    user_confirmed = False
    if user is not None:
        vote = db.get(IssueVote, (issue.id, user.id))
        user_vote = vote.direction if vote else 0
        user_confirmed = db.get(IssueConfirmation, (issue.id, user.id)) is not None
    events = list(
        db.scalars(
            select(IssueEvent)
            .where(IssueEvent.issue_id == issue.id)
            .order_by(IssueEvent.occurred_at, IssueEvent.id)
        ).all()
    )
    base = to_issue_out(issue, area_name, author_handle, user_vote, user_confirmed)
    return IssueDetailOut(**base.model_dump(), timeline=build_timeline(events, issue.status))


def get_visible_issue(db: Session, issue_id: UUID, with_for_update: bool = False) -> Issue:
    """Treat hidden issues as absent on every public/citizen surface."""
    issue = db.get(Issue, issue_id, with_for_update=with_for_update)
    if issue is None or issue.hidden_at is not None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


def lock_issue(db: Session, issue_id: UUID) -> Issue:
    return get_visible_issue(db, issue_id, with_for_update=True)


def set_issue_vote(db: Session, issue_id: UUID, user_id: UUID, direction: int) -> tuple[int, int]:
    issue = lock_issue(db, issue_id)
    vote = db.get(IssueVote, (issue_id, user_id))
    if vote is None:
        db.add(IssueVote(issue_id=issue_id, user_id=user_id, direction=direction))
        issue.vote_score += direction
        new_direction = direction
    elif vote.direction == direction:
        db.delete(vote)
        issue.vote_score -= direction
        new_direction = 0
    else:
        issue.vote_score += direction - vote.direction
        vote.direction = direction
        new_direction = direction
    db.commit()
    return max(issue.vote_score, 0), new_direction


def set_confirmation(
    db: Session, issue_id: UUID, user_id: UUID, lat: float, lon: float
) -> tuple[int, bool]:
    issue = lock_issue(db, issue_id)
    confirmation = db.get(IssueConfirmation, (issue_id, user_id))
    if confirmation is not None:
        db.delete(confirmation)
        issue.confirmations_count = max(issue.confirmations_count - 1, 0)
        db.commit()
        return issue.confirmations_count, False

    witness = WKTElement(f"POINT({lon} {lat})", srid=4326)
    distance = db.scalar(select(func.ST_Distance(Issue.geom, witness)).where(Issue.id == issue_id))
    if distance is not None and distance > MAX_CONFIRMATION_DISTANCE_M:
        raise HTTPException(
            status_code=422, detail="Confirmation coordinates are too far from the issue"
        )
    db.add(
        IssueConfirmation(
            issue_id=issue_id,
            user_id=user_id,
            confirmed_geom=witness,
            distance_m=distance,
        )
    )
    issue.confirmations_count += 1
    db.commit()
    return issue.confirmations_count, True


def create_comment(
    db: Session,
    issue: Issue,
    user: Profile,
    text: str,
    parent_id: UUID | None,
    is_anonymous: bool,
) -> Comment:
    depth = 0
    if parent_id is not None:
        parent = db.get(Comment, parent_id)
        if parent is None or parent.issue_id != issue.id:
            raise HTTPException(
                status_code=422, detail="Parent comment does not belong to this issue"
            )
        depth = parent.depth + 1
        if depth > 3:
            raise HTTPException(status_code=422, detail="Maximum comment depth is 3")

    comment = Comment(
        issue_id=issue.id,
        parent_id=parent_id,
        author_id=user.id,
        is_anonymous=is_anonymous,
        is_official=user.role in ("official", "admin"),
        body=text,
        depth=depth,
    )
    issue.comments_count += 1
    db.add(comment)
    db.commit()
    return comment


def set_comment_vote(
    db: Session, comment_id: UUID, user_id: UUID, direction: int
) -> tuple[int, int]:
    comment = db.get(Comment, comment_id, with_for_update=True)
    if comment is None or comment.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Comment not found")
    vote = db.get(CommentVote, (comment_id, user_id))
    if vote is None:
        db.add(CommentVote(comment_id=comment_id, user_id=user_id, direction=direction))
        comment.vote_score += direction
        new_direction = direction
    elif vote.direction == direction:
        db.delete(vote)
        comment.vote_score -= direction
        new_direction = 0
    else:
        comment.vote_score += direction - vote.direction
        vote.direction = direction
        new_direction = direction
    db.commit()
    return max(comment.vote_score, 0), new_direction


def comment_tree(
    db: Session, issue_id: UUID, user: Profile | None, page: int, limit: int
) -> CommentPage:
    comments = list(
        db.scalars(
            select(Comment)
            .where(Comment.issue_id == issue_id)
            .order_by(Comment.created_at, Comment.id)
            .limit(COMMENT_LOAD_LIMIT)
        ).all()
    )
    author_ids = {comment.author_id for comment in comments}
    handles = dict(
        db.execute(select(Profile.id, Profile.handle).where(Profile.id.in_(author_ids))).all()
    )
    user_votes: dict[Any, int] = {}
    if user is not None and comments:
        user_votes = dict(
            db.execute(
                select(CommentVote.comment_id, CommentVote.direction).where(
                    CommentVote.user_id == user.id,
                    CommentVote.comment_id.in_({comment.id for comment in comments}),
                )
            ).all()
        )

    nodes: dict[UUID, CommentOut] = {}
    for comment in comments:
        nodes[comment.id] = CommentOut(
            id=comment.id,
            author="Anonymous Citizen"
            if comment.is_anonymous
            else handles.get(comment.author_id, "Citizen"),
            is_anonymous=comment.is_anonymous,
            is_official=comment.is_official,
            text="[deleted]" if comment.deleted_at else comment.body,
            upvotes=max(comment.vote_score, 0),
            user_vote=user_votes.get(comment.id, 0),
            depth=comment.depth,
            created_at=comment.created_at,
        )

    roots: list[CommentOut] = []
    for comment in comments:
        node = nodes[comment.id]
        if comment.parent_id is not None and comment.parent_id in nodes:
            nodes[comment.parent_id].replies.append(node)
        else:
            roots.append(node)

    start = (page - 1) * limit
    return CommentPage(items=roots[start : start + limit], total=len(roots), page=page, limit=limit)
