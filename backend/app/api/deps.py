from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_optional_user, get_token
from app.db.session import get_db
from app.models.user import Profile
from app.services.geocoding import Geocoder, get_geocoder
from app.services.storage import StorageClient, get_storage

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[Profile, Depends(get_current_user)]
OptionalUser = Annotated[Profile | None, Depends(get_optional_user)]
AccessToken = Annotated[str, Depends(get_token)]
StorageDep = Annotated[StorageClient, Depends(get_storage)]
GeocoderDep = Annotated[Geocoder, Depends(get_geocoder)]


def require_official(user: CurrentUser) -> Profile:
    if user.role not in ("official", "admin"):
        raise HTTPException(status_code=403, detail="Official role required")
    return user


def require_admin(user: CurrentUser) -> Profile:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


OfficialUser = Annotated[Profile, Depends(require_official)]
AdminUser = Annotated[Profile, Depends(require_admin)]
