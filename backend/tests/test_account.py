import uuid

from sqlalchemy import text

ME = "/api/v1/users/me"
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
    response = client.post(ISSUES, json=payload, headers=auth(token))
    assert response.status_code == 201, response.text
    return response.json()


def row_count(db, sql, **params):
    return db.scalar(text(sql), params)


def test_delete_account_requires_auth(client):
    assert client.delete(ME).status_code == 401


def test_delete_account_anonymizes_and_removes_personal_data(client, make_token, db, area_factory):
    area = area_factory(name="Ward 93 Banjara Hills")
    token, user_id = user_token(make_token)
    other_token, _ = user_token(make_token)
    own_issue = create_issue(client, token)
    other_issue = create_issue(client, other_token)

    client.post(
        f"{ISSUES}/{own_issue['id']}/comments",
        json={"text": "Please fix this soon."},
        headers=auth(token),
    )
    client.post(f"{ISSUES}/{other_issue['id']}/vote", json={"direction": 1}, headers=auth(token))
    client.post(
        f"{ISSUES}/{other_issue['id']}/confirm",
        json={"lat": 17.40, "lon": 78.40},
        headers=auth(token),
    )
    client.post(
        f"{ME}/favorites",
        json={"label": "Home", "areaId": area["id"]},
        headers=auth(token),
    )
    client.patch(f"{ME}/preferences", json={"language": "te"}, headers=auth(token))
    client.post(
        "/api/v1/sla-escalations",
        json={"serviceStandardId": "sla-pothole", "issueId": own_issue["id"]},
        headers=auth(token),
    )

    deleted = client.delete(ME, headers=auth(token))

    assert deleted.status_code == 204
    assert client.get(ME, headers=auth(token)).status_code == 403

    public_issue = client.get(f"{ISSUES}/{own_issue['id']}")
    assert public_issue.status_code == 200
    assert public_issue.json()["isAnonymous"] is True
    assert public_issue.json()["author"] == "Anonymous Citizen"

    comments = client.get(f"{ISSUES}/{own_issue['id']}/comments").json()
    assert comments["items"][0]["author"] == "Anonymous Citizen"
    assert comments["items"][0]["text"] == "Please fix this soon."

    assert row_count(db, "SELECT count(*) FROM favorite_places WHERE user_id = :u", u=user_id) == 0
    assert row_count(db, "SELECT count(*) FROM user_preferences WHERE user_id = :u", u=user_id) == 0
    assert row_count(db, "SELECT count(*) FROM issue_votes WHERE user_id = :u", u=user_id) == 0
    assert (
        row_count(db, "SELECT count(*) FROM issue_confirmations WHERE user_id = :u", u=user_id) == 0
    )
    assert row_count(db, "SELECT count(*) FROM sla_escalations WHERE user_id = :u", u=user_id) == 0

    profile = db.execute(
        text("SELECT handle, display_name, email, phone, deleted_at FROM profiles WHERE id = :u"),
        {"u": user_id},
    ).one()
    assert profile.handle.startswith("deleted_")
    assert profile.display_name == "Deleted Citizen"
    assert profile.email is None
    assert profile.phone is None
    assert profile.deleted_at is not None

    audit = db.scalar(
        text("SELECT count(*) FROM admin_audit_log WHERE action = 'user.delete' AND actor_id = :u"),
        {"u": user_id},
    )
    assert audit == 1
