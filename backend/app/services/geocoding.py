import threading
import time
from dataclasses import dataclass
from functools import lru_cache

import httpx
from fastapi import HTTPException

from app.core.config import get_settings

# OSM Nominatim usage policy: at most 1 request/second, cache results, set a
# valid User-Agent with contact details.
_MIN_INTERVAL_SECONDS = 1.0
_throttle_lock = threading.Lock()
_last_request_at = 0.0


@dataclass
class ReverseGeocodeResult:
    display_name: str
    address: dict[str, str]
    lat: float
    lon: float


def _throttle() -> None:
    global _last_request_at
    with _throttle_lock:
        wait = _MIN_INTERVAL_SECONDS - (time.monotonic() - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.monotonic()


@lru_cache(maxsize=2048)
def _reverse_cached(lat: float, lon: float) -> ReverseGeocodeResult:
    settings = get_settings()
    # ponytail: per-process 1 req/s and in-memory cache; use a shared limiter/cache
    # if multiple backend instances call Nominatim.
    _throttle()
    try:
        response = httpx.get(
            f"{settings.geocoder_url.rstrip('/')}/reverse",
            params={
                "format": "jsonv2",
                "lat": lat,
                "lon": lon,
                "zoom": 18,
                "addressdetails": 1,
            },
            headers={
                "User-Agent": settings.geocoder_user_agent,
                "Accept": "application/json",
            },
            timeout=settings.geocoder_timeout_seconds,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Geocoding service unavailable") from exc

    if response.status_code == 429 or response.status_code >= 500:
        raise HTTPException(status_code=503, detail="Geocoding service unavailable")
    if not response.is_success:
        raise HTTPException(status_code=502, detail="Geocoding request failed")

    data = response.json()
    if data.get("error") or not data.get("display_name"):
        raise HTTPException(status_code=404, detail="No address found for these coordinates")

    address = data.get("address") or {}
    return ReverseGeocodeResult(
        display_name=str(data["display_name"]),
        address={str(key): str(value) for key, value in address.items()},
        lat=lat,
        lon=lon,
    )


class Geocoder:
    def reverse(self, lat: float, lon: float) -> ReverseGeocodeResult:
        # Round to ~1 m so nearby taps share a cache entry.
        return _reverse_cached(round(lat, 5), round(lon, 5))


def get_geocoder() -> Geocoder:
    return Geocoder()
