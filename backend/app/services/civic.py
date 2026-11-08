from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.issue import Issue, IssueConfirmation, IssuePrivateLocation, IssueVote
from app.models.reference import Area, Category
from app.models.user import Profile
from app.schemas.civic import AuditKpis, AuditsOut, ImpactOut, SectorImpact
from app.schemas.issues import IssuePage
from app.services.issues import to_issue_out


def _confirmed_ids(user_id: UUID):
    return select(IssueConfirmation.issue_id).where(IssueConfirmation.user_id == user_id)


def _voted_ids(user_id: UUID):
    return select(IssueVote.issue_id).where(IssueVote.user_id == user_id)


def _activity_filters(user_id: UUID, tab: str) -> list[Any]:
    if tab == "submitted":
        return [Issue.author_id == user_id]
    if tab == "confirmed":
        return [Issue.id.in_(_confirmed_ids(user_id))]
    if tab == "resolved":
        return [
            Issue.status == "resolved",
            or_(Issue.author_id == user_id, Issue.id.in_(_confirmed_ids(user_id))),
        ]
    return [or_(Issue.id.in_(_voted_ids(user_id)), Issue.id.in_(_confirmed_ids(user_id)))]


def activity_page(db: Session, user: Profile, tab: str, page: int, limit: int) -> IssuePage:
    return _page(db, user, _activity_filters(user.id, tab), page, limit)


def audits_page(db: Session, user: Profile, page: int, limit: int) -> AuditsOut:
    authored = [Issue.author_id == user.id]
    result = _page(db, user, authored, page, limit)
    counts = dict(
        db.execute(
            select(Issue.status, func.count(Issue.id))
            .where(Issue.author_id == user.id, Issue.hidden_at.is_(None))
            .group_by(Issue.status)
        ).all()
    )
    return AuditsOut(
        **result.model_dump(),
        kpis=AuditKpis(
            total_logged=sum(counts.values()),
            reported=counts.get("reported", 0),
            under_review=counts.get("under_review", 0),
            in_progress=counts.get("in_progress", 0),
            verified=counts.get("resolved", 0),
        ),
    )


def impact(db: Session, user: Profile) -> ImpactOut:
    related = or_(Issue.author_id == user.id, Issue.id.in_(_confirmed_ids(user.id)))
    rows = db.execute(
        select(
            Category.id,
            Category.name,
            Category.avoided_cost_inr,
            func.count(Issue.id).label("resolved_count"),
        )
        .join(Issue, Issue.category_id == Category.id)
        .where(Issue.status == "resolved", Issue.hidden_at.is_(None), related)
        .group_by(Category.id, Category.name, Category.avoided_cost_inr, Category.sort_order)
        .order_by(Category.sort_order, Category.id)
    ).all()
    breakdown = [
        SectorImpact(
            category_id=row.id,
            category=row.name,
            value_inr=(row.avoided_cost_inr or 0) * row.resolved_count,
            resolved_count=row.resolved_count,
        )
        for row in rows
    ]
    return ImpactOut(
        total_value_inr=sum(item.value_inr for item in breakdown),
        verified_count=sum(item.resolved_count for item in breakdown),
        sector_breakdown=breakdown,
    )


# Export is scoped by author_id and only ever returned to the authenticated author,
# so the exact coordinate from the private location table is safe to include.
# ponytail: builds the whole export in memory; stream or cap rows if a user's history grows large.
def export_rows(db: Session, user: Profile) -> list[dict[str, Any]]:
    rows = db.execute(
        select(
            Issue,
            IssuePrivateLocation.original_lat,
            IssuePrivateLocation.original_lon,
            Area.name,
        )
        .outerjoin(IssuePrivateLocation, IssuePrivateLocation.issue_id == Issue.id)
        .outerjoin(Area, Issue.area_id == Area.id)
        .where(Issue.author_id == user.id, Issue.hidden_at.is_(None))
        .order_by(Issue.created_at.desc(), Issue.id.desc())
    ).all()
    return [
        {
            "publicRef": issue.public_ref,
            "categoryId": issue.category_id,
            "title": issue.title,
            "description": issue.description,
            "location": issue.location_text,
            "ward": area_name,
            "status": issue.status,
            "priority": issue.priority,
            "latitude": float(lat) if lat is not None else None,
            "longitude": float(lon) if lon is not None else None,
            "createdAt": issue.created_at.isoformat(),
            "resolvedAt": issue.resolved_at.isoformat() if issue.resolved_at else None,
        }
        for issue, lat, lon, area_name in rows
    ]


def _page(db: Session, user: Profile, filters: list[Any], page: int, limit: int) -> IssuePage:
    visible = [Issue.hidden_at.is_(None), *filters]
    total = db.scalar(select(func.count()).select_from(select(Issue.id).where(*visible).subquery()))
    rows = db.execute(
        select(Issue, Area.name, Profile.handle)
        .outerjoin(Area, Issue.area_id == Area.id)
        .outerjoin(Profile, Issue.author_id == Profile.id)
        .where(*visible)
        .order_by(Issue.created_at.desc(), Issue.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    ids = [issue.id for issue, _, _ in rows]
    user_votes: dict[UUID, int] = {}
    confirmed: set[UUID] = set()
    if ids:
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
                issue, area_name, handle, user_votes.get(issue.id, 0), issue.id in confirmed
            )
            for issue, area_name, handle in rows
        ],
        total=total or 0,
        page=page,
        limit=limit,
    )
