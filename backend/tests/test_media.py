import uuid

import pytest

from app.main import app
from app.services.storage import ObjectInfo, SignedUpload, get_storage
from tests.test_issues import auth, make_issue

UPLOAD_URL = "/api/v1/media/upload-url"
MAX_BYTES = 1_048_576


class FakeStorage:
    def __init__(self):
        self.uploads = []
        self.objects = {}
        self.signs = []

    def create_signed_upload_url(self, bucket, path, token):
        self.uploads.append((bucket, path, token))
        return SignedUpload(
            bucket=bucket,
            path=path,
            token="upload-token",
            upload_url=f"https://storage.test/upload/{bucket}/{path}",
        )

    def object_info(self, bucket, path, token):
        return self.objects.get((bucket, path))

    def create_signed_url(self, bucket, path, token, expires_in):
        self.signs.append((bucket, path, expires_in))
        return f"https://storage.test/signed/{bucket}/{path}"


@pytest.fixture()
def storage(client):
    fake = FakeStorage()
    app.dependency_overrides[get_storage] = lambda: fake
    return fake


def token_and_id(make_token):
    sub = uuid.uuid4()
    return make_token(sub=sub, email=f"{sub.hex[:8]}@example.com"), sub


def test_upload_url_requires_authentication(client):
    response = client.post(
        UPLOAD_URL,
        json={"kind": "evidence", "contentType": "image/jpeg", "sizeBytes": 1000},
    )

    assert response.status_code == 401


def test_upload_url_rejects_unsupported_mime_type(client, make_token, storage):
    token, _ = token_and_id(make_token)

    response = client.post(
        UPLOAD_URL,
        headers=auth(token),
        json={"kind": "evidence", "contentType": "image/svg+xml", "sizeBytes": 1000},
    )

    assert response.status_code == 422


def test_upload_url_rejects_over_one_megabyte(client, make_token, storage):
    token, _ = token_and_id(make_token)

    response = client.post(
        UPLOAD_URL,
        headers=auth(token),
        json={"kind": "evidence", "contentType": "image/jpeg", "sizeBytes": MAX_BYTES + 1},
    )

    assert response.status_code == 422


def test_upload_url_returns_a_caller_scoped_evidence_path(client, make_token, storage):
    token, sub = token_and_id(make_token)

    response = client.post(
        UPLOAD_URL,
        headers=auth(token),
        json={"kind": "evidence", "contentType": "image/jpeg", "sizeBytes": 500_000},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["bucket"] == "evidence"
    assert body["path"].startswith(f"{sub}/")
    assert body["path"].endswith(".jpg")
    assert body["token"] == "upload-token"
    assert body["uploadUrl"].startswith("https://storage.test/upload/evidence/")
    assert storage.uploads[0][0] == "evidence"


def test_upload_url_routes_avatars_to_the_avatar_bucket(client, make_token, storage):
    token, sub = token_and_id(make_token)

    body = client.post(
        UPLOAD_URL,
        headers=auth(token),
        json={"kind": "avatar", "contentType": "image/webp", "sizeBytes": 1000},
    ).json()

    assert body["bucket"] == "avatars"
    assert body["path"].startswith(f"{sub}/")
    assert body["path"].endswith(".webp")


def test_attach_image_rejects_a_foreign_path(client, make_token, storage):
    token, _ = token_and_id(make_token)
    issue = make_issue(client, token)

    response = client.post(
        f"/api/v1/issues/{issue['id']}/image",
        headers=auth(token),
        json={"path": f"{uuid.uuid4()}/photo.jpg"},
    )

    assert response.status_code == 403


def test_attach_image_rejects_missing_uploaded_object(client, make_token, storage):
    token, sub = token_and_id(make_token)
    issue = make_issue(client, token)
    path = f"{sub}/photo.jpg"

    response = client.post(
        f"/api/v1/issues/{issue['id']}/image",
        headers=auth(token),
        json={"path": path},
    )

    assert response.status_code == 422


def test_attach_image_rejects_an_oversize_uploaded_object(client, make_token, storage):
    token, sub = token_and_id(make_token)
    issue = make_issue(client, token)
    path = f"{sub}/photo.jpg"
    storage.objects[("evidence", path)] = ObjectInfo(size=MAX_BYTES + 1, content_type="image/jpeg")

    response = client.post(
        f"/api/v1/issues/{issue['id']}/image",
        headers=auth(token),
        json={"path": path},
    )

    assert response.status_code == 422


def test_only_the_author_can_attach_the_image(client, make_token, storage):
    author_token, _ = token_and_id(make_token)
    other_token, other_sub = token_and_id(make_token)
    issue = make_issue(client, author_token)
    path = f"{other_sub}/photo.jpg"
    storage.objects[("evidence", path)] = ObjectInfo(size=1000, content_type="image/jpeg")

    response = client.post(
        f"/api/v1/issues/{issue['id']}/image",
        headers=auth(other_token),
        json={"path": path},
    )

    assert response.status_code == 403


def test_attach_image_updates_the_issue(client, make_token, storage):
    token, sub = token_and_id(make_token)
    issue = make_issue(client, token)
    path = f"{sub}/photo.jpg"
    storage.objects[("evidence", path)] = ObjectInfo(size=900_000, content_type="image/jpeg")

    response = client.post(
        f"/api/v1/issues/{issue['id']}/image",
        headers=auth(token),
        json={"path": path, "caption": "Center lane crater"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["imagePath"] == path
    assert body["imageCaption"] == "Center lane crater"


def test_avatar_attach_updates_the_profile(client, make_token, storage):
    token, sub = token_and_id(make_token)
    path = f"{sub}/me.png"
    storage.objects[("avatars", path)] = ObjectInfo(size=100_000, content_type="image/png")

    response = client.post(
        "/api/v1/users/me/avatar",
        headers=auth(token),
        json={"path": path},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["avatarPath"] == path
    assert body["avatarType"] == "image"


def test_issue_image_url_signs_the_stored_path(client, make_token, storage):
    token, sub = token_and_id(make_token)
    issue = make_issue(client, token)
    path = f"{sub}/photo.jpg"
    storage.objects[("evidence", path)] = ObjectInfo(size=1000, content_type="image/jpeg")
    client.post(
        f"/api/v1/issues/{issue['id']}/image",
        headers=auth(token),
        json={"path": path},
    )

    response = client.get(f"/api/v1/issues/{issue['id']}/image-url", headers=auth(token))

    assert response.status_code == 200
    assert response.json()["url"] == f"https://storage.test/signed/evidence/{path}"
    assert storage.signs[0][:2] == ("evidence", path)


def test_issue_image_url_returns_404_when_no_image_exists(client, make_token, storage):
    token, _ = token_and_id(make_token)
    issue = make_issue(client, token)

    response = client.get(f"/api/v1/issues/{issue['id']}/image-url", headers=auth(token))

    assert response.status_code == 404


def test_storage_is_required(client, make_token, monkeypatch):
    from types import SimpleNamespace

    import app.services.storage as storage

    monkeypatch.setattr(storage, "get_settings", lambda: SimpleNamespace(supabase_url=""))
    token, _ = token_and_id(make_token)

    response = client.post(
        UPLOAD_URL,
        headers=auth(token),
        json={"kind": "evidence", "contentType": "image/jpeg", "sizeBytes": 1000},
    )

    assert response.status_code == 503
