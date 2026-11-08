import uuid

import pytest
from sqlalchemy import text

from tests.conftest import MULTIPOLYGON
from tests.test_issues import make_issue


def test_wards_list_returns_name_zone_and_centroid(client, area_factory):
    area = area_factory(
        name="Ward 91 Khairatabad",
        zone="KHAIRATHABAD ZONE",
        circle="12-KHAIRATABAD",
    )

    response = client.get("/api/v1/wards")

    assert response.status_code == 200
    ward = next(item for item in response.json() if item["id"] == area["id"])
    assert ward["name"] == "Ward 91 Khairatabad"
    assert ward["zone"] == "KHAIRATHABAD ZONE"
    assert ward["circle"] == "12-KHAIRATABAD"
    assert ward["center"]["lat"] == pytest.approx(17.40, abs=1e-6)
    assert ward["center"]["lon"] == pytest.approx(78.40, abs=1e-6)


def test_wards_filter_by_zone(client, area_factory):
    area_factory(name="Alpha Ward", zone="KHAIRATHABAD ZONE")
    area_factory(name="Beta Ward", zone="CHARMINAR ZONE")

    wards = client.get("/api/v1/wards", params={"zone": "charminar"}).json()

    assert [ward["name"] for ward in wards] == ["Beta Ward"]


def test_wards_are_sorted_by_name_and_searchable(client, area_factory):
    area_factory(name="Zeta Ward")
    alpha = area_factory(name="Alpha Ward")

    all_wards = client.get("/api/v1/wards").json()
    assert [ward["name"] for ward in all_wards] == ["Alpha Ward", "Zeta Ward"]

    filtered = client.get("/api/v1/wards", params={"q": "alpha"}).json()
    assert [ward["id"] for ward in filtered] == [alpha["id"]]


def test_ward_detail_returns_geojson_polygon(client, area_factory):
    area = area_factory(name="Ward Detail")

    response = client.get(f"/api/v1/wards/{area['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Ward Detail"
    assert body["geometry"]["type"] == "Polygon"
    assert body["center"]["lat"] == pytest.approx(17.40, abs=1e-6)


def test_ward_detail_supports_multipolygon(client, area_factory):
    area = area_factory(name="Multi Ward", wkt=MULTIPOLYGON)

    body = client.get(f"/api/v1/wards/{area['id']}").json()

    assert body["geometry"]["type"] == "MultiPolygon"


def test_unknown_ward_returns_404(client):
    response = client.get(f"/api/v1/wards/{uuid.uuid4()}")

    assert response.status_code == 404


def test_ward_boundaries_return_a_simplified_feature_collection(client, area_factory):
    area = area_factory(
        name="Ward 91 Khairatabad",
        zone="KHAIRATHABAD ZONE",
        circle="12-KHAIRATABAD",
    )

    response = client.get("/api/v1/wards/boundaries")

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    feature = next(item for item in body["features"] if item["properties"]["id"] == area["id"])
    assert feature["properties"]["name"] == "Ward 91 Khairatabad"
    assert feature["properties"]["zone"] == "KHAIRATHABAD ZONE"
    assert feature["properties"]["circle"] == "12-KHAIRATABAD"
    assert feature["properties"]["center"]["lat"] == pytest.approx(17.40, abs=1e-6)
    assert feature["geometry"]["type"] == "Polygon"


def test_ward_boundaries_reject_invalid_tolerance(client):
    assert client.get("/api/v1/wards/boundaries", params={"tolerance": 0}).status_code == 422
    assert client.get("/api/v1/wards/boundaries", params={"tolerance": 1}).status_code == 422


def test_ward_boundaries_include_open_issue_counts(client, make_token, area_factory, db):
    area = area_factory(name="Count Ward")
    sub = uuid.uuid4()
    issue = make_issue(client, make_token(sub=sub, email=f"{sub.hex[:8]}@example.com"))

    feature = next(
        item
        for item in client.get("/api/v1/wards/boundaries").json()["features"]
        if item["properties"]["id"] == area["id"]
    )
    assert feature["properties"]["openIssueCount"] == 1

    db.execute(
        text("UPDATE issues SET status = 'resolved' WHERE id = :id"),
        {"id": uuid.UUID(issue["id"])},
    )
    db.flush()
    db.expire_all()

    feature = next(
        item
        for item in client.get("/api/v1/wards/boundaries").json()["features"]
        if item["properties"]["id"] == area["id"]
    )
    assert feature["properties"]["openIssueCount"] == 0
