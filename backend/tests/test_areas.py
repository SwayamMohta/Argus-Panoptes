from tests.conftest import MULTIPOLYGON, OVERLAP


def test_area_lookup_matched(client, area_factory):
    area = area_factory(name="Ward 91 Khairatabad")

    response = client.get("/api/v1/areas/at", params={"lat": 17.40, "lon": 78.40})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "matched"
    assert body["area"]["id"] == area["id"]
    assert body["area"]["name"] == "Ward 91 Khairatabad"
    assert body["candidates"] == []


def test_area_lookup_includes_boundary_with_st_covers(client, area_factory):
    area_factory(name="Boundary Ward")

    response = client.get("/api/v1/areas/at", params={"lat": 17.39, "lon": 78.40})

    assert response.status_code == 200
    assert response.json()["status"] == "matched"


def test_area_lookup_supports_multipolygon(client, area_factory):
    area_factory(name="Multi Ward", wkt=MULTIPOLYGON)

    response = client.get("/api/v1/areas/at", params={"lat": 17.40, "lon": 78.40})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "matched"
    assert body["area"]["name"] == "Multi Ward"


def test_area_lookup_unmatched_does_not_guess(client):
    response = client.get("/api/v1/areas/at", params={"lat": 0, "lon": 0})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "unmatched"
    assert body["area"] is None
    assert body["candidates"] == []


def test_area_lookup_ambiguous_returns_candidates_without_choosing(client, area_factory):
    first = area_factory(name="First Ward")
    second = area_factory(name="Second Ward", wkt=OVERLAP)

    response = client.get("/api/v1/areas/at", params={"lat": 17.40, "lon": 78.40})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ambiguous"
    assert body["area"] is None
    assert {candidate["id"] for candidate in body["candidates"]} == {first["id"], second["id"]}


def test_area_search_matches_ward_name(client, area_factory):
    area = area_factory(name="Ward 105 Gachibowli")

    response = client.get("/api/v1/areas", params={"q": "gachibowli"})

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [area["id"]]


def test_nearest_area_returns_distance(client, area_factory):
    area = area_factory(name="Ward 91 Khairatabad")
    area_factory(
        name="Far Ward",
        wkt="POLYGON((78.50 17.50, 78.52 17.50, 78.52 17.52, 78.50 17.52, 78.50 17.50))",
    )

    response = client.get(
        "/api/v1/areas/nearest", params={"lat": 17.405, "lon": 78.405, "limit": 1}
    )

    assert response.status_code == 200
    body = response.json()
    assert body[0]["area"]["id"] == area["id"]
    assert body[0]["distanceM"] < 2000
