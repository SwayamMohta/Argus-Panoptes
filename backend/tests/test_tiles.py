import pytest

from app.services import tiles


class FakeResponse:
    def __init__(
        self, status_code=200, content=b"tile-bytes", content_type="image/png", blocked=False
    ):
        self.status_code = status_code
        self.content = content
        self.headers = {"content-type": content_type}
        if blocked:
            self.headers["x-blocked"] = "Access denied"


class FakeClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def get(self, url, headers=None):
        self.calls.append((url, dict(headers or {})))
        return self.responses.pop(0)


@pytest.fixture(autouse=True)
def clear_tile_cache():
    tiles.fetch_tile.cache_clear()
    yield
    tiles.fetch_tile.cache_clear()


def test_tile_falls_back_when_osm_is_blocked(client, monkeypatch):
    fake = FakeClient(
        [
            FakeResponse(blocked=True),
            FakeResponse(content=b"osm-fr-tile"),
        ]
    )
    monkeypatch.setattr(tiles, "_client", lambda: fake)

    response = client.get("/api/v1/tiles/13/4671/3566.png")

    assert response.status_code == 200
    assert response.content == b"osm-fr-tile"
    assert response.headers["x-tile-provider"] == "osm-fr"
    assert "max-age=86400" in response.headers["cache-control"]
    assert response.headers["content-type"].startswith("image/png")


def test_tile_sends_the_civicapp_user_agent(client, monkeypatch):
    fake = FakeClient([FakeResponse()])
    monkeypatch.setattr(tiles, "_client", lambda: fake)

    assert client.get("/api/v1/tiles/13/4671/3566.png").status_code == 200

    _, headers = fake.calls[0]
    assert headers["User-Agent"] == "CivicApp/2.0"


def test_tile_returns_502_when_every_provider_fails(client, monkeypatch):
    fake = FakeClient(
        [
            FakeResponse(blocked=True),
            FakeResponse(status_code=500, content_type="text/html"),
            FakeResponse(status_code=403, content_type="text/html"),
        ]
    )
    monkeypatch.setattr(tiles, "_client", lambda: fake)

    response = client.get("/api/v1/tiles/13/4671/3566.png")

    assert response.status_code == 502


def test_tile_rejects_out_of_range_coordinates(client):
    assert client.get("/api/v1/tiles/20/0/0.png").status_code == 404
    assert client.get("/api/v1/tiles/2/4/0.png").status_code == 404
    assert client.get("/api/v1/tiles/0/1/0.png").status_code == 404
