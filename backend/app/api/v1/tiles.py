from fastapi import APIRouter, HTTPException, Response

from app.core.config import get_settings
from app.services.tiles import fetch_tile

router = APIRouter(tags=["tiles"])

MAX_ZOOM = 19


@router.get("/tiles/{z}/{x}/{y}.png")
def get_tile(z: int, x: int, y: int):
    limit = 1 << z
    if z < 0 or z > MAX_ZOOM or x < 0 or y < 0 or x >= limit or y >= limit:
        raise HTTPException(status_code=404, detail="Tile out of range")

    content, content_type, provider = fetch_tile(z, x, y)
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": f"public, max-age={get_settings().tile_cache_seconds}",
            "X-Tile-Provider": provider,
        },
    )
