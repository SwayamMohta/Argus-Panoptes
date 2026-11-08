from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    admin,
    areas,
    civic,
    geocoding,
    health,
    issues,
    media,
    reference,
    tiles,
    users,
)
from app.core.config import get_settings
from app.core.observability import RequestContextMiddleware, configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="Argus Panoptes API", version="0.1.0")

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

app.include_router(health.router)
app.include_router(reference.router, prefix=settings.api_v1_prefix)
app.include_router(areas.router, prefix=settings.api_v1_prefix)
app.include_router(users.router, prefix=settings.api_v1_prefix)
app.include_router(civic.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)
app.include_router(issues.router, prefix=settings.api_v1_prefix)
app.include_router(media.router, prefix=settings.api_v1_prefix)
app.include_router(geocoding.router, prefix=settings.api_v1_prefix)
app.include_router(tiles.router, prefix=settings.api_v1_prefix)
