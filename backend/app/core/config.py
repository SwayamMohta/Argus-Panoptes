from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+psycopg://argus:argus@localhost:5433/argus"
    cors_origins: str = "http://localhost:8081,http://localhost:19006"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"

    supabase_url: str = ""
    supabase_jwt_aud: str = "authenticated"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    evidence_bucket: str = "evidence"
    avatar_bucket: str = "avatars"
    max_image_bytes: int = 1_048_576
    signed_url_ttl_seconds: int = 3600

    geocoder_url: str = "https://nominatim.openstreetmap.org"
    geocoder_user_agent: str = "ArgusPanoptes/0.1"
    geocoder_timeout_seconds: float = 8.0

    tile_user_agent: str = "CivicApp/2.0"
    tile_cache_seconds: int = 86_400

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_issuer}/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
