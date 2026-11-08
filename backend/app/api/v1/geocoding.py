from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, GeocoderDep
from app.schemas.geocoding import ReverseGeocodeOut

router = APIRouter(tags=["geocoding"])


@router.get("/geocode/reverse", response_model=ReverseGeocodeOut)
def reverse_geocode(
    user: CurrentUser,
    geocoder: GeocoderDep,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    result = geocoder.reverse(lat, lon)
    return ReverseGeocodeOut(
        display_name=result.display_name,
        address=result.address,
        lat=result.lat,
        lon=result.lon,
    )
