from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession
from app.core.config import get_settings
from app.schemas.reference import HealthOut

router = APIRouter()


@router.get("/health", response_model=HealthOut)
def health(db: DbSession):
    settings = get_settings()
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "error",
                "environment": settings.environment,
            },
        )
    return HealthOut(status="ok", database="ok", environment=settings.environment)
