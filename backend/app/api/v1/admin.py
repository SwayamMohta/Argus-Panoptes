from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, DbSession
from app.models.admin import AdminAuditLog
from app.models.issue import Comment, Issue
from app.models.reference import Area, Notice
from app.models.user import Profile
from app.schemas.admin import (
    AdminReportOut,
    AdminReportPage,
    AdminUserOut,
    AuditLogOut,
    AuditLogPage,
    CommentModerationIn,
    CommentModerationOut,
    IssueModerationIn,
    NoticeCreate,
    NoticeUpdate,
    RoleUpdate,
)
from app.schemas.reference import NoticeOut
from app.services.admin import log_audit
from app.services.issues import to_issue_out

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/reports", response_model=AdminReportPage)
def moderation_queue(
    admin: AdminUser,
    db: DbSession,
    status: str | None = None,
    category_id: str | None = Query(None, alias="categoryId"),
    hidden: bool | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    filters = []
    if status:
        filters.append(Issue.status == status)
    if category_id:
        filters.append(Issue.category_id == category_id)
    if hidden is not None:
        filters.append(Issue.hidden_at.is_not(None) if hidden else Issue.hidden_at.is_(None))

    total = db.scalar(select(func.count()).select_from(select(Issue.id).where(*filters).subquery()))
    issues = list(
        db.scalars(
            select(Issue)
            .where(*filters)
            .order_by(Issue.created_at.desc(), Issue.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        ).all()
    )
    # Moderators can see anonymous authorship here, so the read is auditable.
    log_audit(
        db,
        admin,
        "moderation.view",
        "admin_reports",
        "list",
        {"count": len(issues), "status": status, "hidden": hidden, "categoryId": category_id},
    )
    db.commit()
    return AdminReportPage(
        items=[_report_out(db, issue) for issue in issues],
        total=total or 0,
        page=page,
        limit=limit,
    )


@router.patch("/reports/{issue_id}", response_model=AdminReportOut)
def moderate_issue(
    issue_id: UUID,
    payload: IssueModerationIn,
    admin: AdminUser,
    db: DbSession,
):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    if payload.hidden:
        issue.hidden_at = datetime.now(UTC)
        issue.hidden_reason = payload.reason
    else:
        issue.hidden_at = None
        issue.hidden_reason = None
    log_audit(
        db,
        admin,
        "issue.hide" if payload.hidden else "issue.unhide",
        "issue",
        issue.id,
        {"reason": payload.reason},
    )
    db.commit()
    return _report_out(db, issue)


@router.patch("/comments/{comment_id}", response_model=CommentModerationOut)
def moderate_comment(
    comment_id: UUID,
    payload: CommentModerationIn,
    admin: AdminUser,
    db: DbSession,
):
    comment = db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.deleted_at = datetime.now(UTC) if payload.hidden else None
    log_audit(
        db,
        admin,
        "comment.hide" if payload.hidden else "comment.unhide",
        "comment",
        comment.id,
    )
    db.commit()
    return CommentModerationOut(id=comment.id, issue_id=comment.issue_id, hidden=payload.hidden)


@router.get("/audit-log", response_model=AuditLogPage)
def audit_log(
    admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    total = db.scalar(select(func.count()).select_from(AdminAuditLog))
    items = list(
        db.scalars(
            select(AdminAuditLog)
            .order_by(AdminAuditLog.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        ).all()
    )
    return AuditLogPage(
        items=[AuditLogOut.model_validate(item) for item in items],
        total=total or 0,
        page=page,
        limit=limit,
    )


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
def assign_role(user_id: UUID, payload: RoleUpdate, admin: AdminUser, db: DbSession):
    target = db.get(Profile, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status_code=422, detail="Admins cannot change their own role")

    previous = target.role
    target.role = payload.role
    log_audit(
        db,
        admin,
        "user.role",
        "profile",
        target.id,
        {"from": previous, "to": payload.role},
    )
    db.commit()
    return AdminUserOut.model_validate(target)


@router.post("/notices", response_model=NoticeOut, status_code=201)
def create_notice(payload: NoticeCreate, admin: AdminUser, db: DbSession):
    notice = Notice(
        id=payload.id,
        title=payload.title,
        summary=payload.summary,
        category=payload.category,
        category_label=payload.category_label or payload.category.title(),
        source=payload.source,
        published_on=payload.published_on,
        expires_on=payload.expires_on,
        is_official=payload.is_official,
        impact=payload.impact,
        contact_helpline=payload.contact_helpline,
        locality_text=payload.locality,
    )
    db.add(notice)
    log_audit(db, admin, "notice.create", "notice", notice.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Notice already exists") from None
    return notice


@router.patch("/notices/{notice_id}", response_model=NoticeOut)
def update_notice(notice_id: str, payload: NoticeUpdate, admin: AdminUser, db: DbSession):
    notice = db.get(Notice, notice_id)
    if notice is None:
        raise HTTPException(status_code=404, detail="Notice not found")

    data = payload.model_dump(exclude_unset=True)
    if "category" in data and "category_label" not in data:
        notice.category_label = data["category"].title()
    if "locality" in data:
        notice.locality_text = data.pop("locality")
    published = data.get("published_on", notice.published_on)
    expires = data.get("expires_on", notice.expires_on)
    if expires is not None and expires < published:
        raise HTTPException(status_code=422, detail="expiresOn must not be before publishedOn")

    for field, value in data.items():
        setattr(notice, field, value)
    log_audit(db, admin, "notice.update", "notice", notice.id, {"fields": sorted(data)})
    db.commit()
    return notice


@router.delete("/notices/{notice_id}", status_code=204)
def delete_notice(notice_id: str, admin: AdminUser, db: DbSession):
    notice = db.get(Notice, notice_id)
    if notice is None:
        raise HTTPException(status_code=404, detail="Notice not found")
    log_audit(db, admin, "notice.delete", "notice", notice.id)
    db.delete(notice)
    db.commit()
    return Response(status_code=204)


def _report_out(db, issue: Issue) -> AdminReportOut:
    area = db.get(Area, issue.area_id) if issue.area_id else None
    author = db.get(Profile, issue.author_id)
    base = to_issue_out(issue, area.name if area else None, author.handle if author else None)
    return AdminReportOut(
        **base.model_dump(),
        author_id=issue.author_id,
        author_handle=author.handle if author else "Unknown",
        hidden_at=issue.hidden_at,
        hidden_reason=issue.hidden_reason,
    )
