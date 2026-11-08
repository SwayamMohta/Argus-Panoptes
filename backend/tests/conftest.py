import os
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.seed.reference_data import seed_all

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://argus:argus@localhost:5433/argus_test",
)

if "_test" not in TEST_DATABASE_URL:
    raise RuntimeError("Refusing to run tests against a non-test database")

engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"options": "-csearch_path=public,extensions"},
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

SQUARE = "POLYGON((78.39 17.39, 78.41 17.39, 78.41 17.41, 78.39 17.41, 78.39 17.39))"
OVERLAP = "POLYGON((78.395 17.395, 78.415 17.395, 78.415 17.415, 78.395 17.415, 78.395 17.395))"
MULTIPOLYGON = (
    "MULTIPOLYGON(((78.39 17.39, 78.41 17.39, 78.41 17.41, 78.39 17.41, 78.39 17.39)), "
    "((78.50 17.50, 78.52 17.50, 78.52 17.52, 78.50 17.52, 78.50 17.50)))"
)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    with engine.begin() as connection:
        connection.execute(text("CREATE SCHEMA IF NOT EXISTS extensions"))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions"))
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestingSessionLocal() as session:
        seed_all(session)
        session.commit()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture()
def make_token(monkeypatch, signing_key):
    """Sign JWTs locally and stub out JWKS fetching, so verification is still real."""
    from app.core import security
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(
        security,
        "_jwk_client",
        lambda: SimpleNamespace(
            get_signing_key_from_jwt=lambda _token: SimpleNamespace(key=signing_key.public_key())
        ),
    )

    def _make(sub=None, key=None, **overrides):
        claims = {
            "sub": str(sub or uuid.uuid4()),
            "aud": settings.supabase_jwt_aud,
            "iss": settings.supabase_issuer,
            "exp": datetime.now(UTC) + timedelta(hours=1),
        }
        claims.update(overrides)
        claims = {name: value for name, value in claims.items() if value is not None}
        return jwt.encode(claims, key or signing_key, algorithm="RS256")

    return _make


@pytest.fixture()
def area_factory(db):
    counter = {"n": 1000}

    def create(
        name="Test Colony",
        wkt=SQUARE,
        zone=None,
        circle=None,
    ):
        counter["n"] += 1
        area_id = uuid.uuid4()
        if name == "Test Colony":
            name = f"Test Colony {counter['n']}"
        db.execute(
            text(
                """
                INSERT INTO areas (id, name, zone, circle, geom)
                VALUES (
                    :id, :name, :zone, :circle,
                    ST_GeomFromText(:wkt, 4326)
                )
                """
            ),
            {
                "id": area_id,
                "name": name,
                "zone": zone,
                "circle": circle,
                "wkt": wkt,
            },
        )
        db.flush()
        return {"id": str(area_id), "name": name, "zone": zone, "circle": circle}

    return create
