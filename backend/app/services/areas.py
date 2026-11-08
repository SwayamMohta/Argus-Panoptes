from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.reference import Area


def find_areas_at(db: Session, lat: float, lon: float) -> list[Area]:
    point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
    statement = select(Area).where(func.ST_Covers(Area.geom, point)).order_by(Area.name, Area.id)
    return list(db.scalars(statement).all())
