import csv
import io
import json
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.models.civic import FavoritePlace, SlaEscalation
from app.models.issue import Issue
from app.models.reference import Area, ServiceStandard
from app.schemas.civic import (
    AuditsOut,
    FavoriteCreate,
    FavoriteOut,
    FavoriteUpdate,
    ImpactOut,
    SlaEscalationCreate,
    SlaEscalationOut,
)
from app.schemas.issues import IssuePage
from app.services.civic import activity_page, audits_page, export_rows, impact
from app.services.issues import point

router = APIRouter(tags=["civic"])


@router.get("/users/me/activity", response_model=IssuePage)
def my_activity(
    user: CurrentUser,
    db: DbSession,
    tab: Literal["submitted", "confirmed", "resolved", "tracked"] = "submitted",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    return activity_page(db, user, tab, page, limit)


@router.get("/users/me/audits", response_model=AuditsOut)
def my_audits(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    return audits_page(db, user, page, limit)


@router.get("/users/me/impact", response_model=ImpactOut)
def my_impact(user: CurrentUser, db: DbSession):
    return impact(db, user)


@router.get("/users/me/favorites", response_model=list[FavoriteOut])
def list_favorites(user: CurrentUser, db: DbSession):
    rows = db.execute(
        select(FavoritePlace, Area.name, Area.zone, Area.circle)
        .outerjoin(Area, FavoritePlace.area_id == Area.id)
        .where(FavoritePlace.user_id == user.id)
        .order_by(FavoritePlace.pinned.desc(), FavoritePlace.created_at.desc(), FavoritePlace.id)
    ).all()
    return [_favorite_out(favorite, name, zone, circle) for favorite, name, zone, circle in rows]


@router.post("/users/me/favorites", response_model=FavoriteOut, status_code=201)
def add_favorite(payload: FavoriteCreate, user: CurrentUser, db: DbSession):
    area = None
    if payload.area_id is not None:
        area = db.get(Area, payload.area_id)
        if area is None:
            raise HTTPException(status_code=422, detail="Unknown area")
    geom = None
    if payload.coordinates is not None:
        geom = point(payload.coordinates.lat, payload.coordinates.lon)
    favorite = FavoritePlace(
        user_id=user.id,
        area_id=payload.area_id,
        label=payload.label,
        geom=geom,
        pinned=payload.pinned,
    )
    db.add(favorite)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Area already favorited") from None
    return _favorite_out(
        favorite,
        getattr(area, "name", None),
        getattr(area, "zone", None),
        getattr(area, "circle", None),
    )


@router.patch("/users/me/favorites/{favorite_id}", response_model=FavoriteOut)
def update_favorite(favorite_id: UUID, payload: FavoriteUpdate, user: CurrentUser, db: DbSession):
    favorite = _own_favorite(db, favorite_id, user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(favorite, field, value)
    db.commit()
    area = db.get(Area, favorite.area_id) if favorite.area_id else None
    return _favorite_out(
        favorite,
        getattr(area, "name", None),
        getattr(area, "zone", None),
        getattr(area, "circle", None),
    )


@router.delete("/users/me/favorites/{favorite_id}", status_code=204)
def delete_favorite(favorite_id: UUID, user: CurrentUser, db: DbSession):
    favorite = _own_favorite(db, favorite_id, user.id)
    db.delete(favorite)
    db.commit()
    return Response(status_code=204)


@router.get("/users/me/export")
def export_records(
    user: CurrentUser,
    db: DbSession,
    format: Literal["json", "csv", "geojson"] = Query("json"),
):
    rows = export_rows(db, user)
    filename = f"argus-export-{user.handle}.{_EXTENSIONS[format]}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    if format == "csv":
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=_EXPORT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
        return Response(buffer.getvalue(), media_type="text/csv", headers=headers)
    if format == "geojson":
        collection = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": _point_geometry(row),
                    "properties": row,
                }
                for row in rows
            ],
        }
        return Response(json.dumps(collection), media_type="application/geo+json", headers=headers)
    return Response(json.dumps(rows), media_type="application/json", headers=headers)


@router.post("/sla-escalations", response_model=SlaEscalationOut, status_code=201)
def create_sla_escalation(payload: SlaEscalationCreate, user: CurrentUser, db: DbSession):
    if db.get(ServiceStandard, payload.service_standard_id) is None:
        raise HTTPException(status_code=422, detail="Unknown service standard")
    if payload.issue_id is not None and db.get(Issue, payload.issue_id) is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    escalation = SlaEscalation(
        user_id=user.id,
        issue_id=payload.issue_id,
        service_standard_id=payload.service_standard_id,
        note=payload.note,
        status="queued",
    )
    db.add(escalation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Escalation already filed") from None
    return escalation


def _own_favorite(db, favorite_id: UUID, user_id: UUID) -> FavoritePlace:
    favorite = db.scalar(
        select(FavoritePlace).where(
            FavoritePlace.id == favorite_id, FavoritePlace.user_id == user_id
        )
    )
    if favorite is None:
        raise HTTPException(status_code=404, detail="Favorite place not found")
    return favorite


def _favorite_out(favorite, area_name, zone, circle) -> FavoriteOut:
    return FavoriteOut(
        id=favorite.id,
        label=favorite.label,
        area_id=favorite.area_id,
        area=area_name,
        zone=zone,
        circle=circle,
        pinned=favorite.pinned,
        created_at=favorite.created_at,
    )


def _point_geometry(row: dict) -> dict | None:
    if row["latitude"] is None or row["longitude"] is None:
        return None
    return {"type": "Point", "coordinates": [row["longitude"], row["latitude"]]}


_EXPORT_COLUMNS = (
    "publicRef",
    "categoryId",
    "title",
    "description",
    "location",
    "ward",
    "status",
    "priority",
    "latitude",
    "longitude",
    "createdAt",
    "resolvedAt",
)
_EXTENSIONS = {"json": "json", "csv": "csv", "geojson": "geojson"}
