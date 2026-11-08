from app.schemas.base import APIModel


class ReverseGeocodeOut(APIModel):
    display_name: str
    address: dict[str, str]
    lat: float
    lon: float
    attribution: str = "© OpenStreetMap contributors"
