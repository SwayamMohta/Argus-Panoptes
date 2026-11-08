import json
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from geoalchemy2 import Geography
from sqlalchemy import func, select

from app.api.deps import DbSession
from app.models.issue import Issue
from app.models.reference import Area
from app.schemas.reference import (
    AreaLookupOut,
    AreaOut,
    NearestAreaOut,
    WardCenter,
    WardDetailOut,
    WardOut,
)
from app.services.areas import find_areas_at

router = APIRouter()


@router.get("/areas", response_model=list[AreaOut])
def list_areas(
    db: DbSession,
    q: str | None = Query(None, min_length=1, max_length=100),
):
    statement = select(Area).order_by(Area.name)
    if q:
        statement = statement.where(Area.name.ilike(f"%{q}%"))
    return list(db.scalars(statement.limit(200)).all())


@router.get("/areas/at", response_model=AreaLookupOut)
def areas_at(
    db: DbSession,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    matches = find_areas_at(db, lat, lon)
    if not matches:
        return AreaLookupOut(status="unmatched", area=None, candidates=[])
    if len(matches) == 1:
        return AreaLookupOut(
            status="matched",
            area=AreaOut.model_validate(matches[0]),
            candidates=[],
        )
    return AreaLookupOut(
        status="ambiguous",
        area=None,
        candidates=[AreaOut.model_validate(area) for area in matches],
    )


@router.get("/areas/nearest", response_model=list[NearestAreaOut])
def nearest_areas(
    db: DbSession,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    limit: int = Query(3, ge=1, le=10),
):
    point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
    distance = func.ST_Distance(Area.geom.cast(Geography), point.cast(Geography))
    rows = db.execute(
        select(Area, distance.label("distance_m")).order_by(distance).limit(limit)
    ).all()
    return [
        NearestAreaOut(area=AreaOut.model_validate(area), distance_m=float(distance_m))
        for area, distance_m in rows
    ]


@router.get("/areas/{area_id}", response_model=AreaOut)
def get_area(area_id: UUID, db: DbSession):
    area = db.get(Area, area_id)
    if area is None:
        raise HTTPException(status_code=404, detail="Area not found")
    return area


def _ward_statement():
    center = func.ST_Centroid(Area.geom)
    return select(
        Area.id,
        Area.name,
        Area.zone,
        Area.circle,
        func.ST_Y(center).label("lat"),
        func.ST_X(center).label("lon"),
    )


@router.get("/wards", response_model=list[WardOut])
def list_wards(
    db: DbSession,
    q: str | None = Query(None, min_length=1, max_length=100),
    zone: str | None = Query(None, min_length=1, max_length=100),
):
    statement = _ward_statement().order_by(Area.name)
    if q:
        statement = statement.where(Area.name.ilike(f"%{q}%"))
    if zone:
        statement = statement.where(Area.zone.ilike(f"%{zone}%"))
    rows = db.execute(statement.limit(200)).all()
    return [
        WardOut(
            id=row.id,
            name=row.name,
            zone=row.zone,
            circle=row.circle,
            center=WardCenter(lat=row.lat, lon=row.lon),
        )
        for row in rows
    ]


@router.get("/wards/boundaries")
def ward_boundaries(
    db: DbSession,
    tolerance: float = Query(0.0001, gt=0, le=0.001),
):
    open_counts = (
        select(Issue.area_id, func.count(Issue.id).label("open_count"))
        .where(Issue.status != "resolved", Issue.hidden_at.is_(None))
        .group_by(Issue.area_id)
        .subquery()
    )
    statement = (
        select(
            Area.id,
            Area.name,
            Area.zone,
            Area.circle,
            func.ST_Y(func.ST_Centroid(Area.geom)).label("lat"),
            func.ST_X(func.ST_Centroid(Area.geom)).label("lon"),
            func.coalesce(open_counts.c.open_count, 0).label("open_count"),
            func.ST_AsGeoJSON(func.ST_SimplifyPreserveTopology(Area.geom, tolerance)).label(
                "geometry"
            ),
        )
        .outerjoin(open_counts, Area.id == open_counts.c.area_id)
        .order_by(Area.name)
    )
    rows = db.execute(statement).all()
    return {
        "type": "FeatureCollection",
        "attribution": "GHMC ward boundaries (ghmc_wards.kml)",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": str(row.id),
                    "name": row.name,
                    "zone": row.zone,
                    "circle": row.circle,
                    "center": {"lat": row.lat, "lon": row.lon},
                    "openIssueCount": row.open_count,
                },
                "geometry": json.loads(row.geometry),
            }
            for row in rows
        ],
    }


@router.get("/wards/{ward_id}", response_model=WardDetailOut)
def get_ward(ward_id: UUID, db: DbSession):
    row = db.execute(_ward_statement().where(Area.id == ward_id)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Ward not found")
    return WardDetailOut(
        id=row.id,
        name=row.name,
        zone=row.zone,
        circle=row.circle,
        center=WardCenter(lat=row.lat, lon=row.lon),
        geometry=json.loads(
            db.execute(select(func.ST_AsGeoJSON(Area.geom)).where(Area.id == ward_id)).scalar_one()
        ),
    )
