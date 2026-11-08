from sqlalchemy import text


def test_categories_include_eight_with_checkpoints(client):
    response = client.get("/api/v1/categories")

    assert response.status_code == 200
    categories = response.json()
    assert len(categories) == 8
    roads = next(category for category in categories if category["id"] == "roads")
    assert len(roads["checkpoints"]) == 4
    assert roads["checkpoints"][0]["isCritical"] is True


def test_notices_support_include_expired_and_hide_expired_by_default(client, db):
    all_notices = client.get("/api/v1/notices", params={"includeExpired": "true"}).json()
    active_notices = client.get("/api/v1/notices").json()

    assert len(all_notices) == 5
    assert len(active_notices) <= len(all_notices)
    # The API filters with the database's current_date, so compare with the same clock.
    today = db.scalar(text("SELECT current_date")).isoformat()
    for notice in active_notices:
        assert notice["expiryDate"] is None or notice["expiryDate"] >= today


def test_notices_filter_by_category(client):
    notices = client.get(
        "/api/v1/notices", params={"includeExpired": "true", "category": "water"}
    ).json()

    assert len(notices) == 1
    assert all(notice["category"] == "water" for notice in notices)


def test_notices_search_matches_title_summary_or_locality(client):
    by_locality = client.get(
        "/api/v1/notices", params={"includeExpired": "true", "q": "Begumpet"}
    ).json()
    by_title = client.get(
        "/api/v1/notices", params={"includeExpired": "true", "q": "Feeder Pillar"}
    ).json()

    assert [notice["id"] for notice in by_locality] == ["notice-hmwssb-05"]
    assert [notice["id"] for notice in by_title] == ["notice-tsspdcl-03"]


def test_service_standards_include_six(client):
    response = client.get("/api/v1/service-standards")

    assert response.status_code == 200
    assert len(response.json()) == 6
