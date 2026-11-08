from functools import lru_cache

import httpx
from fastapi import HTTPException

from app.core.config import get_settings

# ponytail: in-process LRU; add a shared/CDN cache before multi-instance use.
# The proxy exists because React Native Image cannot reliably set a User-Agent.
UPSTREAMS = (
    ("osm", "https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
    ("osm-fr", "https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"),
    ("osm-hot", "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"),
)


@lru_cache
def _client() -> httpx.Client:
    return httpx.Client(timeout=8, follow_redirects=True)


@lru_cache(maxsize=1024)
def fetch_tile(z: int, x: int, y: int) -> tuple[bytes, str, str]:
    """Fetch one tile, falling back when OSM blocks app traffic."""
    headers = {"User-Agent": get_settings().tile_user_agent}
    for provider, template in UPSTREAMS:
        url = template.format(z=z, x=x, y=y)
        try:
            response = _client().get(url, headers=headers)
        except httpx.HTTPError:
            continue

        content_type = response.headers.get("content-type", "").split(";", 1)[0]
        blocked = "x-blocked" in response.headers
        if response.status_code == 200 and not blocked and content_type.startswith("image/"):
            return response.content, content_type, provider

    raise HTTPException(status_code=502, detail="Tile providers are unavailable")
