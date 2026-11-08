from fastapi import HTTPException

from app.main import app
from app.services.geocoding import ReverseGeocodeResult, get_geocoder
from tests.test_issues import auth, user_token

REVERSE = "/api/v1/geocode/reverse"


class FakeGeocoder:
    def __init__(self):
        self.calls = []

    def reverse(self, lat, lon):
        self.calls.append((lat, lon))
        return ReverseGeocodeResult(
            display_name="Road No. 12, Banjara Hills, Hyderabad, Telangana, India",
            address={"road": "Road No. 12", "suburb": "Banjara Hills", "city": "Hyderabad"},
            lat=lat,
            lon=lon,
        )


def test_reverse_geocode_requires_authentication(client):
    response = client.get(REVERSE, params={"lat": 17.4156, "lon": 78.4350})

    assert response.status_code == 401


def test_reverse_geocode_rejects_invalid_coordinates(client, make_token):
    token, _ = user_token(make_token)

    response = client.get(REVERSE, params={"lat": 100, "lon": 78.4350}, headers=auth(token))

    assert response.status_code == 422


def test_reverse_geocode_returns_an_address(client, make_token):
    fake = FakeGeocoder()
    app.dependency_overrides[get_geocoder] = lambda: fake
    token, _ = user_token(make_token)

    response = client.get(REVERSE, params={"lat": 17.4156, "lon": 78.4350}, headers=auth(token))

    assert response.status_code == 200
    body = response.json()
    assert "Banjara Hills" in body["displayName"]
    assert body["address"]["road"] == "Road No. 12"
    assert body["lat"] == 17.4156
    assert body["lon"] == 78.435
    assert body["attribution"] == "© OpenStreetMap contributors"
    assert fake.calls == [(17.4156, 78.435)]


def test_reverse_geocode_handles_upstream_failure(client, make_token):
    class FailingGeocoder:
        def reverse(self, lat, lon):
            raise HTTPException(status_code=503, detail="Geocoding service unavailable")

    app.dependency_overrides[get_geocoder] = lambda: FailingGeocoder()
    token, _ = user_token(make_token)

    response = client.get(REVERSE, params={"lat": 17.4156, "lon": 78.4350}, headers=auth(token))

    assert response.status_code == 503
