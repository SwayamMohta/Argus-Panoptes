import uuid
from datetime import UTC, datetime, timedelta

from cryptography.hazmat.primitives.asymmetric import rsa

ME = "/api/v1/users/me"
PREFERENCES = "/api/v1/users/me/preferences"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_missing_token_returns_401(client):
    response = client.get(ME)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_malformed_token_returns_401(client, make_token):
    response = client.get(ME, headers=auth("not-a-jwt"))

    assert response.status_code == 401


def test_token_signed_with_unknown_key_returns_401(client, make_token):
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    response = client.get(ME, headers=auth(make_token(key=other_key)))

    assert response.status_code == 401


def test_expired_token_returns_401(client, make_token):
    expired = datetime.now(UTC) - timedelta(minutes=1)

    response = client.get(ME, headers=auth(make_token(exp=expired)))

    assert response.status_code == 401


def test_wrong_audience_returns_401(client, make_token):
    response = client.get(ME, headers=auth(make_token(aud="anon")))

    assert response.status_code == 401


def test_wrong_issuer_returns_401(client, make_token):
    response = client.get(ME, headers=auth(make_token(iss="https://evil.example/auth/v1")))

    assert response.status_code == 401


def test_valid_token_lazily_creates_profile(client, make_token):
    sub = uuid.uuid4()

    response = client.get(ME, headers=auth(make_token(sub=sub, email="asha@example.com")))

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(sub)
    assert body["email"] == "asha@example.com"
    assert body["displayName"] == "asha"
    assert body["handle"] == f"user_{sub.hex[:12]}"
    assert body["role"] == "citizen"
    assert body["scorePercentage"] == 100.0


def test_profile_is_reused_instead_of_recreated(client, make_token):
    sub = uuid.uuid4()
    token = make_token(sub=sub)

    first = client.get(ME, headers=auth(token))
    second = client.get(ME, headers=auth(token))

    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_patch_profile_round_trip(client, make_token):
    token = make_token(email="asha@example.com")

    response = client.patch(
        ME,
        headers=auth(token),
        json={"displayName": "Asha Rao", "bannerTheme": "skyBlue", "city": "Hyderabad"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["displayName"] == "Asha Rao"
    assert body["bannerTheme"] == "skyBlue"
    assert body["city"] == "Hyderabad"
    assert client.get(ME, headers=auth(token)).json()["displayName"] == "Asha Rao"


def test_patch_profile_rejects_invalid_values(client, make_token):
    response = client.patch(ME, headers=auth(make_token()), json={"handle": "Not Allowed"})

    assert response.status_code == 422


def test_users_only_see_and_change_their_own_profile(client, make_token):
    alice = make_token(email="alice@example.com")
    bob = make_token(email="bob@example.com")

    alice_id = client.get(ME, headers=auth(alice)).json()["id"]
    bob_id = client.get(ME, headers=auth(bob)).json()["id"]
    client.patch(ME, headers=auth(alice), json={"displayName": "Alice"})

    assert alice_id != bob_id
    assert client.get(ME, headers=auth(bob)).json()["displayName"] == "bob"


def test_duplicate_handle_returns_409_without_corrupting_the_session(client, make_token):
    alice = make_token(email="alice@example.com")
    bob = make_token(email="bob@example.com")
    client.patch(ME, headers=auth(alice), json={"handle": "shared_handle"})

    response = client.patch(ME, headers=auth(bob), json={"handle": "shared_handle"})

    assert response.status_code == 409
    assert client.get(ME, headers=auth(bob)).status_code == 200


def test_default_preferences_are_created(client, make_token):
    response = client.get(PREFERENCES, headers=auth(make_token()))

    assert response.status_code == 200
    assert response.json() == {
        "pseudonymousMode": True,
        "homeRadiusMasking": True,
        "gpsMaskingRadiusM": 500,
        "showContactOnRti": False,
        "autoSyncWifi": True,
        "notificationsEnabled": True,
        "notificationChannels": {
            "statusChanges": True,
            "upvotesAndComments": True,
            "wardAlerts": True,
            "emergencyBroadcasts": True,
        },
        "themeMode": "system",
        "isAppLockEnabled": False,
        "lockTimeout": "5m",
        "language": "en",
        "autoClearCache": True,
    }


def test_patch_preferences_updates_only_supplied_fields(client, make_token):
    token = make_token()

    response = client.patch(
        PREFERENCES,
        headers=auth(token),
        json={"themeMode": "dark", "gpsMaskingRadiusM": 250},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["themeMode"] == "dark"
    assert body["gpsMaskingRadiusM"] == 250
    assert body["pseudonymousMode"] is True
    assert client.get(PREFERENCES, headers=auth(token)).json()["themeMode"] == "dark"


def test_put_preferences_replaces_all_supplied_fields(client, make_token):
    token = make_token()

    response = client.put(
        PREFERENCES,
        headers=auth(token),
        json={"pseudonymousMode": False, "language": "te"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["pseudonymousMode"] is False
    assert body["language"] == "te"
    assert body["themeMode"] == "system"


def test_preferences_reject_invalid_values(client, make_token):
    response = client.patch(
        PREFERENCES,
        headers=auth(make_token()),
        json={"gpsMaskingRadiusM": 123},
    )

    assert response.status_code == 422
