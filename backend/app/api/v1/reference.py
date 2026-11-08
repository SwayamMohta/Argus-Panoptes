from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession
from app.models.reference import Category, Notice, ServiceStandard
from app.schemas.reference import CategoryOut, NoticeOut, ServiceStandardOut

router = APIRouter()


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DbSession):
    statement = (
        select(Category)
        .options(selectinload(Category.checkpoints))
        .order_by(Category.sort_order, Category.id)
    )
    return list(db.scalars(statement).all())


@router.get("/categories/{category_id}", response_model=CategoryOut)
def get_category(category_id: str, db: DbSession):
    statement = (
        select(Category)
        .options(selectinload(Category.checkpoints))
        .where(Category.id == category_id)
    )
    category = db.scalars(statement).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("/notices", response_model=list[NoticeOut])
def list_notices(
    db: DbSession,
    include_expired: bool = Query(False, alias="includeExpired"),
    category: str | None = None,
    q: str | None = Query(None, min_length=1, max_length=100),
):
    statement = select(Notice).order_by(Notice.published_on.desc(), Notice.id)
    if not include_expired:
        statement = statement.where(
            or_(Notice.expires_on.is_(None), Notice.expires_on >= func.current_date())
        )
    if category:
        statement = statement.where(Notice.category == category)
    if q:
        pattern = f"%{q}%"
        statement = statement.where(
            or_(
                Notice.title.ilike(pattern),
                Notice.summary.ilike(pattern),
                Notice.locality_text.ilike(pattern),
            )
        )
    return list(db.scalars(statement).all())


@router.get("/service-standards", response_model=list[ServiceStandardOut])
def list_service_standards(db: DbSession):
    statement = select(ServiceStandard).order_by(ServiceStandard.sort_order, ServiceStandard.id)
    return list(db.scalars(statement).all())
