import csv
import io
import json
import uuid

from sqlalchemy import text

ME = "/api/v1/users/me"
ACTIVITY = f"{ME}/activity"
AUDITS = f"{ME}/audits"
IMPACT = f"{ME}/impact"
FAVORITES = f"{ME}/favorites"
EXPORT = f"{ME}/export"
ESCALATIONS = "/api/v1/sla-escalations"
ISSUES = "/api/v1/issues"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def user_token(make_token):
    sub = uuid.uuid4()
    return make_token(sub=sub, email=f"{sub.hex[:8]}@example.com"), sub


def create_issue(client, token, **overrides):
    payload = {
        "categoryId": "roads",
        "title": "Dangerous pothole near the main junction",
        "description": "Deep crater in the center lane.",
        "location": "Banjara Hills, Road No. 12",
        "coordinates": {"lat": 17.40, "lon": 78.40},
    }
    payload.update(overrides)
    return client.post(ISSUES, json=payload, headers=auth(token))


def make_issue(client, token, **overrides):
    response = create_issue(client, token, **overrides)
    assert response.status_code == 201, response.text
    return response.json()


def confirm(client, token, issue_id, lat=17.40, lon=78.40):
    response = client.post(
        f"{ISSUES}/{issue_id}/confirm",
        json={"lat": lat, "lon": lon},
        headers=auth(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def vote(client, token, issue_id, direction=1):
    response = client.post(
        f"{ISSUES}/{issue_id}/vote",
        json={"direction": direction},
        headers=auth(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def set_status(db, issue_id, status):
    db.execute(
        text(
            "UPDATE issues SET status = :status, "
            "resolved_at = CASE WHEN :status_check = 'resolved' THEN now() ELSE NULL END "
            "WHERE id = :id"
        ),
        {"status": status, "status_check": status, "id": uuid.UUID(issue_id)},
    )
    db.flush()
    db.expire_all()


def ids(body):
    return {item["id"] for item in body["items"]}


def test_activity_requires_auth(client):
    assert client.get(ACTIVITY).status_code == 401
    assert client.get(AUDITS).status_code == 401
    assert client.get(IMPACT).status_code == 401
    assert client.get(FAVORITES).status_code == 401
    assert client.get(EXPORT).status_code == 401


def test_activity_tabs_scope_to_the_caller(client, make_token, db):
    token_a, _ = user_token(make_token)
    token_b, _ = user_token(make_token)
    issue_a = make_issue(client, token_a)
    issue_b = make_issue(client, token_b)
    confirm(client, token_a, issue_b["id"])
    set_status(db, issue_b["id"], "resolved")

    submitted = client.get(ACTIVITY, params={"tab": "submitted"}, headers=auth(token_a))
    confirmed = client.get(ACTIVITY, params={"tab": "confirmed"}, headers=auth(token_a))
    resolved = client.get(ACTIVITY, params={"tab": "resolved"}, headers=auth(token_a))
    tracked = client.get(ACTIVITY, params={"tab": "tracked"}, headers=auth(token_a))

    assert submitted.status_code == 200
    assert ids(submitted.json()) == {issue_a["id"]}
    assert ids(confirmed.json()) == {issue_b["id"]}
    assert ids(resolved.json()) == {issue_b["id"]}
    assert ids(tracked.json()) == {issue_a["id"], issue_b["id"]}

    b_submitted = client.get(ACTIVITY, params={"tab": "submitted"}, headers=auth(token_b))
    b_confirmed = client.get(ACTIVITY, params={"tab": "confirmed"}, headers=auth(token_b))
    assert ids(b_submitted.json()) == {issue_b["id"]}
    assert b_confirmed.json()["items"] == []


def test_activity_personalizes_votes_and_confirmations(client, make_token):
    token_a, _ = user_token(make_token)
    token_b, _ = user_token(make_token)
    issue = make_issue(client, token_b)
    vote(client, token_a, issue["id"])
    confirm(client, token_a, issue["id"])

    body = client.get(ACTIVITY, params={"tab": "tracked"}, headers=auth(token_a)).json()

    assert body["total"] == 1
    item = body["items"][0]
    assert item["userVote"] == 1
    assert item["userConfirmed"] is True


def test_audits_returns_own_records_and_kpis(client, make_token, db):
    token_a, _ = user_token(make_token)
    token_b, _ = user_token(make_token)
    first = make_issue(client, token_a)
    second = make_issue(client, token_a)
    make_issue(client, token_a)
    make_issue(client, token_b)
    set_status(db, first["id"], "resolved")
    set_status(db, second["id"], "under_review")

    response = client.get(AUDITS, headers=auth(token_a))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["kpis"] == {
        "totalLogged": 3,
        "reported": 1,
        "underReview": 1,
        "inProgress": 0,
        "verified": 1,
    }
    assert first["id"] in ids(body)


def test_impact_counts_distinct_resolved_issues_once(client, make_token, db):
    token_a, _ = user_token(make_token)
    token_b, _ = user_token(make_token)
    authored_roads = make_issue(client, token_a)
    authored_roads_2 = make_issue(client, token_a)
    witnessed_water = make_issue(client, token_b, categoryId="water")
    own_and_witnessed = make_issue(client, token_a)
    confirm(client, token_a, witnessed_water["id"])
    confirm(client, token_a, own_and_witnessed["id"])
    unrelated = make_issue(client, token_b)
    for issue in (authored_roads, authored_roads_2, witnessed_water, own_and_witnessed, unrelated):
        set_status(db, issue["id"], "resolved")

    response = client.get(IMPACT, headers=auth(token_a))

    assert response.status_code == 200
    body = response.json()
    assert body["verifiedCount"] == 4
    assert body["totalValueInr"] == 48000 * 3 + 28400
    assert body["sectorBreakdown"] == [
        {
            "categoryId": "roads",
            "category": "Roads & Works",
            "valueInr": 144000,
            "resolvedCount": 3,
        },
        {
            "categoryId": "water",
            "category": "Water Works & Supply",
            "valueInr": 28400,
            "resolvedCount": 1,
        },
    ]


def test_impact_ignores_unresolved_issues(client, make_token):
    token, _ = user_token(make_token)
    make_issue(client, token)

    body = client.get(IMPACT, headers=auth(token)).json()

    assert body == {"totalValueInr": 0, "verifiedCount": 0, "sectorBreakdown": []}


def test_favorites_crud_and_ownership(client, make_token, area_factory):
    area = area_factory(name="Ward 102 Banjara Hills", zone="KHAIRATABAD ZONE", circle="12")
    token_a, _ = user_token(make_token)
    token_b, _ = user_token(make_token)

    created = client.post(
        FAVORITES,
        json={"label": "Road No. 12", "areaId": area["id"]},
        headers=auth(token_a),
    )
    assert created.status_code == 201, created.text
    favorite = created.json()
    assert favorite["label"] == "Road No. 12"
    assert favorite["areaId"] == area["id"]
    assert favorite["area"] == area["name"]
    assert favorite["zone"] == "KHAIRATABAD ZONE"
    assert favorite["pinned"] is True

    duplicate = client.post(
        FAVORITES,
        json={"label": "Same ward again", "areaId": area["id"]},
        headers=auth(token_a),
    )
    assert duplicate.status_code == 409

    point_only = client.post(
        FAVORITES,
        json={"label": "My junction", "coordinates": {"lat": 17.40, "lon": 78.40}},
        headers=auth(token_a),
    )
    assert point_only.status_code == 201
    assert point_only.json()["areaId"] is None

    listed = client.get(FAVORITES, headers=auth(token_a))
    assert listed.status_code == 200
    assert {item["id"] for item in listed.json()} == {favorite["id"], point_only.json()["id"]}

    updated = client.patch(
        f"{FAVORITES}/{favorite['id']}",
        json={"label": "Renamed", "pinned": False},
        headers=auth(token_a),
    )
    assert updated.status_code == 200
    assert updated.json()["label"] == "Renamed"
    assert updated.json()["pinned"] is False

    assert (
        client.patch(
            f"{FAVORITES}/{favorite['id']}", json={"pinned": True}, headers=auth(token_b)
        ).status_code
        == 404
    )
    assert client.delete(f"{FAVORITES}/{favorite['id']}", headers=auth(token_b)).status_code == 404

    deleted = client.delete(f"{FAVORITES}/{favorite['id']}", headers=auth(token_a))
    assert deleted.status_code == 204
    assert client.get(FAVORITES, headers=auth(token_a)).json()[0]["id"] == point_only.json()["id"]


def test_favorites_validate_area_and_coordinates(client, make_token):
    token, _ = user_token(make_token)

    unknown = client.post(
        FAVORITES, json={"label": "Nowhere", "areaId": str(uuid.uuid4())}, headers=auth(token)
    )
    assert unknown.status_code == 422

    outside = client.post(
        FAVORITES,
        json={"label": "Outside", "coordinates": {"lat": 0, "lon": 0}},
        headers=auth(token),
    )
    assert outside.status_code == 422

    unanchored = client.post(FAVORITES, json={"label": "No location"}, headers=auth(token))
    assert unanchored.status_code == 422


def test_export_scopes_to_caller_and_formats(client, make_token):
    token_a, _ = user_token(make_token)
    token_b, _ = user_token(make_token)
    first = make_issue(client, token_a, title="Export one")
    second = make_issue(client, token_a, title="Export two", isAnonymous=True)
    foreign = make_issue(client, token_b, title="Not mine")

    as_json = client.get(EXPORT, params={"format": "json"}, headers=auth(token_a))
    assert as_json.status_code == 200
    body = as_json.json()
    assert {item["publicRef"] for item in body} == {first["publicRef"], second["publicRef"]}
    assert foreign["publicRef"] not in {item["publicRef"] for item in body}
    assert {(item["latitude"], item["longitude"]) for item in body} == {
        (17.4, 78.4),
    }

    as_csv = client.get(EXPORT, params={"format": "csv"}, headers=auth(token_a))
    assert as_csv.status_code == 200
    assert as_csv.headers["content-type"].startswith("text/csv")
    assert "attachment" in as_csv.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(as_csv.text)))
    assert len(rows) == 2
    assert {row["publicRef"] for row in rows} == {first["publicRef"], second["publicRef"]}
    assert rows[0]["latitude"] == "17.4"

    as_geojson = client.get(EXPORT, params={"format": "geojson"}, headers=auth(token_a))
    assert as_geojson.status_code == 200
    assert as_geojson.headers["content-type"].startswith("application/geo+json")
    collection = json.loads(as_geojson.text)
    assert collection["type"] == "FeatureCollection"
    assert len(collection["features"]) == 2
    assert collection["features"][0]["geometry"]["coordinates"] == [78.4, 17.4]

    assert client.get(EXPORT, params={"format": "xml"}, headers=auth(token_a)).status_code == 422


def test_sla_escalation_create_and_validation(client, make_token):
    token, _ = user_token(make_token)
    issue = make_issue(client, token)
    payload = {"issueId": issue["id"], "serviceStandardId": "sla-pothole", "note": "48h passed"}

    created = client.post(ESCALATIONS, json=payload, headers=auth(token))
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "queued"
    assert body["issueId"] == issue["id"]
    assert body["serviceStandardId"] == "sla-pothole"

    assert client.post(ESCALATIONS, json=payload, headers=auth(token)).status_code == 409
    assert (
        client.post(
            ESCALATIONS,
            json={"serviceStandardId": "does-not-exist"},
            headers=auth(token),
        ).status_code
        == 422
    )
    assert (
        client.post(
            ESCALATIONS,
            json={"serviceStandardId": "sla-pothole", "issueId": str(uuid.uuid4())},
            headers=auth(token),
        ).status_code
        == 404
    )
    assert client.post(ESCALATIONS, json=payload).status_code == 401
