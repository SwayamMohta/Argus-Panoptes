import uuid

import pytest
from sqlalchemy import text

from app.main import app
from app.services import ratelimit
from app.services.storage import ObjectInfo, get_storage
from tests.test_media import FakeStorage

ME = "/api/v1/users/me"
ISSUES = "/api/v1/issues"
ADMIN_REPORTS = "/api/v1/admin/reports"
AUDIT_LOG = "/api/v1/admin/audit-log"
ADMIN_NOTICES = "/api/v1/admin/notices"
ROLE = "/api/v1/admin/users/{}/role"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def users(client, make_token, db):
    def create(role="citizen"):
        sub = uuid.uuid4()
        token = make_token(sub=sub, email=f"{sub.hex[:8]}@example.com")
        assert client.get(ME, headers=auth(token)).status_code == 200
        if role != "citizen":
            db.execute(
                text("UPDATE profiles SET role = :role WHERE id = :id"),
                {"role": role, "id": sub},
            )
            db.flush()
            db.expire_all()
        return token, sub

    return create


def create_issue(client, token, **overrides):
    payload = {
        "categoryId": "roads",
        "title": "Dangerous pothole near the main junction",
        "description": "Deep crater in the center lane.",
        "location": "Banjara Hills, Road No. 12",
        "coordinates": {"lat": 17.40, "lon": 78.40},
    }
    payload.update(overrides)
    response = client.post(ISSUES, json=payload, headers=auth(token))
    assert response.status_code == 201, response.text
    return response.json()


def set_status(client, token, issue_id, status, **extra):
    return client.post(
        f"{ISSUES}/{issue_id}/status",
        json={"status": status, **extra},
        headers=auth(token),
    )


def test_admin_and_official_routes_require_roles(client, users):
    citizen, _ = users()
    official, _ = users("official")
    nobody = "not-a-token"

    for token in (citizen, official, nobody):
        response = client.get(ADMIN_REPORTS, headers=auth(token) if token != nobody else {})
        assert response.status_code in (401, 403)

    assert (
        client.post(
            ADMIN_NOTICES,
            json={
                "id": "notice-x",
                "title": "x",
                "summary": "y",
                "category": "water",
                "source": "z",
            },
            headers=auth(official),
        ).status_code
        == 403
    )
    assert client.get(AUDIT_LOG, headers=auth(official)).status_code == 403


def test_official_advances_status_forward_only(client, users):
    author, _ = users()
    official, _ = users("official")
    citizen, _ = users()
    issue = create_issue(client, author)

    under_review = set_status(client, official, issue["id"], "under_review")
    assert under_review.status_code == 200, under_review.text
    assert under_review.json()["status"] == "under_review"
    assert under_review.json()["timeline"][1]["completed"] is True
    assert under_review.json()["timeline"][1]["date"] is not None

    assert set_status(client, official, issue["id"], "in_progress").status_code == 200
    resolved = set_status(client, official, issue["id"], "resolved")
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"
    assert resolved.json()["resolvedAt"] is not None

    backwards = set_status(client, official, issue["id"], "reported")
    assert backwards.status_code == 422
    assert set_status(client, official, issue["id"], "resolved").status_code == 422
    assert set_status(client, citizen, issue["id"], "resolved").status_code == 403
    assert set_status(client, official, str(uuid.uuid4()), "under_review").status_code == 404


@pytest.fixture()
def storage(client):
    fake = FakeStorage()
    app.dependency_overrides[get_storage] = lambda: fake
    return fake


def test_resolution_image_is_owned_validated_and_signed(client, users, storage):
    author, author_id = users()
    official, official_id = users("official")
    issue = create_issue(client, author)
    assert set_status(client, official, issue["id"], "under_review").status_code == 200
    assert set_status(client, official, issue["id"], "in_progress").status_code == 200
    assert set_status(client, official, issue["id"], "resolved").status_code == 200

    path = f"{official_id}/resolution.jpg"
    storage.objects[("evidence", path)] = ObjectInfo(size=1000, content_type="image/jpeg")

    foreign = client.post(
        f"{ISSUES}/{issue['id']}/resolution-image",
        json={"path": f"{author_id}/resolution.jpg"},
        headers=auth(official),
    )
    assert foreign.status_code == 403

    missing = client.post(
        f"{ISSUES}/{issue['id']}/resolution-image",
        json={"path": f"{official_id}/missing.jpg"},
        headers=auth(official),
    )
    assert missing.status_code == 422

    attached = client.post(
        f"{ISSUES}/{issue['id']}/resolution-image",
        json={"path": path},
        headers=auth(official),
    )
    assert attached.status_code == 200, attached.text
    assert attached.json()["resolvedImagePath"] == path

    signed = client.get(f"{ISSUES}/{issue['id']}/resolution-image-url", headers=auth(author))
    assert signed.status_code == 200
    assert signed.json()["url"].endswith(path)


def test_hidden_issue_disappears_from_public_surfaces(client, users):
    author, _ = users()
    other, _ = users()
    admin, _ = users("admin")
    issue = create_issue(client, author)
    client.post(
        f"{ISSUES}/{issue['id']}/comments",
        json={"text": "Visible comment"},
        headers=auth(author),
    )

    hidden = client.patch(
        f"{ADMIN_REPORTS}/{issue['id']}",
        json={"hidden": True, "reason": "abusive content"},
        headers=auth(admin),
    )
    assert hidden.status_code == 200, hidden.text
    assert hidden.json()["hiddenReason"] == "abusive content"

    feed = client.get(ISSUES)
    assert feed.status_code == 200
    assert issue["id"] not in {item["id"] for item in feed.json()["items"]}
    assert client.get(f"{ISSUES}/{issue['id']}").status_code == 404
    assert client.get(f"{ISSUES}/{issue['id']}/comments").status_code == 404
    assert (
        client.post(
            f"{ISSUES}/{issue['id']}/vote", json={"direction": 1}, headers=auth(other)
        ).status_code
        == 404
    )
    assert (
        client.get(f"{ME}/activity", params={"tab": "submitted"}, headers=auth(author)).json()[
            "total"
        ]
        == 0
    )

    restored = client.patch(
        f"{ADMIN_REPORTS}/{issue['id']}",
        json={"hidden": False},
        headers=auth(admin),
    )
    assert restored.status_code == 200
    assert client.get(f"{ISSUES}/{issue['id']}").status_code == 200


def test_moderation_queue_exposes_author_and_hidden_state(client, users):
    author, author_id = users()
    admin, _ = users("admin")
    issue = create_issue(client, author, isAnonymous=True)
    client.patch(f"{ADMIN_REPORTS}/{issue['id']}", json={"hidden": True}, headers=auth(admin))

    response = client.get(ADMIN_REPORTS, params={"hidden": "true"}, headers=auth(admin))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    item = body["items"][0]
    assert item["id"] == issue["id"]
    assert item["authorId"] == str(author_id)
    assert item["authorHandle"].startswith("user_")
    assert item["hiddenAt"] is not None


def test_comment_moderation_soft_deletes(client, users):
    author, _ = users()
    admin, _ = users("admin")
    issue = create_issue(client, author)
    comment = client.post(
        f"{ISSUES}/{issue['id']}/comments",
        json={"text": "Offensive comment"},
        headers=auth(author),
    ).json()

    hidden = client.patch(
        f"/api/v1/admin/comments/{comment['id']}",
        json={"hidden": True},
        headers=auth(admin),
    )
    assert hidden.status_code == 200, hidden.text

    tree = client.get(f"{ISSUES}/{issue['id']}/comments").json()
    assert tree["items"][0]["text"] == "[deleted]"

    restored = client.patch(
        f"/api/v1/admin/comments/{comment['id']}",
        json={"hidden": False},
        headers=auth(admin),
    )
    assert restored.status_code == 200
    tree = client.get(f"{ISSUES}/{issue['id']}/comments").json()
    assert tree["items"][0]["text"] == "Offensive comment"


def test_notice_admin_crud_and_audit_log(client, users):
    admin, _ = users("admin")
    official, _ = users("official")
    payload = {
        "id": "notice-test-01",
        "title": "Water shutdown",
        "summary": "Supply interruption in Banjara Hills.",
        "category": "water",
        "source": "HMWSSB",
        "publishedOn": "2026-11-08",
        "expiresOn": "2026-11-10",
        "locality": "Banjara Hills",
    }

    assert client.post(ADMIN_NOTICES, json=payload, headers=auth(official)).status_code == 403
    created = client.post(ADMIN_NOTICES, json=payload, headers=auth(admin))
    assert created.status_code == 201, created.text
    assert created.json()["categoryLabel"] == "Water"
    assert created.json()["locality"] == "Banjara Hills"
    assert client.post(ADMIN_NOTICES, json=payload, headers=auth(admin)).status_code == 409

    updated = client.patch(
        f"{ADMIN_NOTICES}/{payload['id']}",
        json={"title": "Water shutdown updated"},
        headers=auth(admin),
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Water shutdown updated"

    assert client.delete(f"{ADMIN_NOTICES}/{payload['id']}", headers=auth(admin)).status_code == 204
    notice_ids = {
        item["id"]
        for item in client.get("/api/v1/notices", params={"includeExpired": "true"}).json()
    }
    assert payload["id"] not in notice_ids

    audit = client.get(AUDIT_LOG, params={"limit": 10}, headers=auth(admin)).json()
    actions = {item["action"] for item in audit["items"]}
    assert {"notice.create", "notice.update", "notice.delete"} <= actions
    assert audit["items"][0]["actorId"] is not None


def test_role_assignment(client, users):
    admin, admin_id = users("admin")
    citizen, citizen_id = users()
    issue = create_issue(client, citizen)

    assert (
        client.patch(ROLE.format(admin_id), json={"role": "admin"}, headers=auth(admin)).status_code
        == 422
    )
    assert (
        client.patch(
            ROLE.format(uuid.uuid4()), json={"role": "official"}, headers=auth(admin)
        ).status_code
        == 404
    )
    assert (
        client.patch(
            ROLE.format(citizen_id), json={"role": "official"}, headers=auth(citizen)
        ).status_code
        == 403
    )

    promoted = client.patch(ROLE.format(citizen_id), json={"role": "official"}, headers=auth(admin))
    assert promoted.status_code == 200
    assert promoted.json()["role"] == "official"
    assert set_status(client, citizen, issue["id"], "under_review").status_code == 200

    audit = client.get(AUDIT_LOG, headers=auth(admin)).json()
    assert any(item["action"] == "user.role" for item in audit["items"])


def test_report_creation_is_rate_limited(client, users, monkeypatch):
    ratelimit.reset()
    monkeypatch.setattr(ratelimit, "ISSUE_CREATE_LIMIT", 2)
    author, _ = users()

    create_issue(client, author)
    create_issue(client, author)
    third = client.post(
        ISSUES,
        json={
            "categoryId": "roads",
            "title": "Third report in the window",
            "description": "Should be rejected.",
            "location": "Banjara Hills",
            "coordinates": {"lat": 17.40, "lon": 78.40},
        },
        headers=auth(author),
    )

    assert third.status_code == 429


def test_audit_log_requires_admin(client, users):
    citizen, _ = users()

    assert client.get(AUDIT_LOG, headers=auth(citizen)).status_code == 403
    assert client.get(AUDIT_LOG).status_code == 401
