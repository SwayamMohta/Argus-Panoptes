from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi import HTTPException

from app.core.config import get_settings

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


@dataclass
class SignedUpload:
    bucket: str
    path: str
    token: str
    upload_url: str


@dataclass
class ObjectInfo:
    size: int
    content_type: str


@lru_cache
def _http() -> httpx.Client:
    return httpx.Client(timeout=10)


def get_storage() -> "StorageClient":
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Storage is not configured")
    return StorageClient(
        base_url=settings.supabase_url,
        service_key=settings.supabase_service_role_key,
        api_key=settings.supabase_anon_key,
    )


class StorageClient:
    """Thin Supabase Storage REST client.

    Uses the service-role key when configured; otherwise forwards the caller's
    access token so Storage RLS decides what the user may do.
    """

    def __init__(self, base_url: str, service_key: str = "", api_key: str = "") -> None:
        self.base_url = base_url.rstrip("/")
        self.service_key = service_key
        self.api_key = api_key

    def _headers(self, token: str) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self.service_key or token}"}
        if self.api_key:
            headers["apikey"] = self.api_key
        return headers

    def create_signed_upload_url(self, bucket: str, path: str, token: str) -> SignedUpload:
        response = _http().post(
            f"{self.base_url}/storage/v1/object/upload/sign/{bucket}/{path}",
            headers=self._headers(token),
        )
        self._raise_for_storage(response)
        data = response.json()
        raw_url = data.get("url") or data.get("signedURL") or data.get("signedUrl")
        if not raw_url:
            raise HTTPException(status_code=502, detail="Storage returned no upload URL")
        upload_url = self._absolute(raw_url)
        upload_token = (
            data.get("token") or (parse_qs(urlparse(upload_url).query).get("token", [""])[0])
        )
        return SignedUpload(bucket=bucket, path=path, token=upload_token, upload_url=upload_url)

    def create_signed_url(self, bucket: str, path: str, token: str, expires_in: int) -> str:
        response = _http().post(
            f"{self.base_url}/storage/v1/object/sign/{bucket}/{path}",
            headers=self._headers(token),
            json={"expiresIn": expires_in},
        )
        self._raise_for_storage(response)
        data = response.json()
        raw_url = data.get("signedURL") or data.get("signedUrl") or data.get("url")
        if not raw_url:
            raise HTTPException(status_code=502, detail="Storage returned no signed URL")
        return self._absolute(raw_url)

    def object_info(self, bucket: str, path: str, token: str) -> ObjectInfo | None:
        response = _http().head(
            f"{self.base_url}/storage/v1/object/{bucket}/{path}",
            headers=self._headers(token),
        )
        if response.status_code == 404:
            return None
        self._raise_for_storage(response)
        content_type = response.headers.get("content-type", "").split(";", 1)[0]
        return ObjectInfo(
            size=int(response.headers.get("content-length", 0)),
            content_type=content_type,
        )

    def _absolute(self, url: str) -> str:
        if url.startswith("http"):
            return url
        if url.startswith("/storage/v1"):
            return f"{self.base_url}{url}"
        return f"{self.base_url}/storage/v1{url}"

    @staticmethod
    def _raise_for_storage(response: httpx.Response) -> None:
        if response.is_success:
            return
        # Do not echo the provider body; it may include internal details.
        raise HTTPException(status_code=502, detail="Storage service error")


def require_owned_image(
    storage: StorageClient,
    access_token: str,
    bucket: str,
    path: str,
    user_id: object,
) -> None:
    """Reject foreign paths and objects that violate the image contract."""
    if ".." in path or not path.startswith(f"{user_id}/"):
        raise HTTPException(status_code=403, detail="Object path is not owned by the caller")
    info = storage.object_info(bucket, path, access_token)
    if info is None:
        raise HTTPException(status_code=422, detail="Uploaded object not found")
    settings = get_settings()
    if info.size <= 0 or info.size > settings.max_image_bytes:
        raise HTTPException(
            status_code=422,
            detail=f"Images must be at most {settings.max_image_bytes} bytes",
        )
    if info.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported image type")
