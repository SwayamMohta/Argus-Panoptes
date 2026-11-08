from functools import lru_cache
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import Profile, UserPreferences

ALGORITHMS = ["ES256", "RS256"]
_UNAUTHORIZED = {"WWW-Authenticate": "Bearer"}


class TokenClaims(BaseModel):
    sub: UUID
    email: str | None = None
    phone: str | None = None


@lru_cache
def _jwk_client() -> PyJWKClient:
    return PyJWKClient(get_settings().supabase_jwks_url)


def get_token(authorization: Annotated[str | None, Header()] = None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Not authenticated", headers=_UNAUTHORIZED)
    return token.strip()


def verify_token(token: Annotated[str, Depends(get_token)]) -> TokenClaims:
    settings = get_settings()
    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=ALGORITHMS,
            audience=settings.supabase_jwt_aud,
            issuer=settings.supabase_issuer,
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
        return TokenClaims(
            sub=payload["sub"], email=payload.get("email"), phone=payload.get("phone")
        )
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials", headers=_UNAUTHORIZED
        ) from exc


def get_current_user(
    claims: Annotated[TokenClaims, Depends(verify_token)],
    db: Annotated[Session, Depends(get_db)],
) -> Profile:
    profile = db.get(Profile, claims.sub)
    if profile is not None:
        if profile.deleted_at is not None:
            raise HTTPException(status_code=403, detail="Account has been deleted")
        return profile

    profile = Profile(
        id=claims.sub,
        handle=f"user_{claims.sub.hex[:12]}",
        display_name=_display_name(claims),
        email=claims.email,
        phone=claims.phone,
    )
    db.add(profile)
    db.add(UserPreferences(user_id=claims.sub))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        profile = db.get(Profile, claims.sub)
        if profile is None:
            raise HTTPException(
                status_code=401, detail="Could not resolve profile", headers=_UNAUTHORIZED
            ) from None
    return profile


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> Profile | None:
    """Public endpoints personalize for a valid token; an invalid token is still rejected."""
    if not authorization:
        return None
    return get_current_user(verify_token(get_token(authorization)), db)


def _display_name(claims: TokenClaims) -> str:
    if claims.email:
        return claims.email.split("@", 1)[0][:150]
    return "Citizen"
