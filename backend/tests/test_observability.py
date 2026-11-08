import json
import logging

from sqlalchemy.exc import SQLAlchemyError

from app.core.observability import JsonFormatter, new_request_id, request_id_ctx
from app.db.session import get_db
from app.main import app


def test_generates_a_request_id(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert len(response.headers["x-request-id"]) == 32


def test_echoes_a_safe_request_id(client):
    response = client.get("/health", headers={"X-Request-ID": "device-abc.123"})

    assert response.headers["x-request-id"] == "device-abc.123"


def test_replaces_an_unsafe_request_id(client):
    response = client.get("/health", headers={"X-Request-ID": "bad id!"})

    assert response.headers["x-request-id"] != "bad id!"
    assert len(response.headers["x-request-id"]) == 32


def test_new_request_id_rejects_long_values():
    assert new_request_id("a" * 65) != "a" * 65


def test_json_formatter_adds_request_and_http_fields():
    token = request_id_ctx.set("rid-123")
    record = logging.LogRecord("argus.request", logging.INFO, __file__, 1, "request", None, None)
    record.method = "GET"
    record.path = "/health"
    record.status = 200
    record.durationMs = 1.5
    try:
        payload = json.loads(JsonFormatter().format(record))
    finally:
        request_id_ctx.reset(token)

    assert payload["requestId"] == "rid-123"
    assert payload["method"] == "GET"
    assert payload["path"] == "/health"
    assert payload["status"] == 200
    assert payload["durationMs"] == 1.5


def test_health_returns_503_when_the_database_fails(client):
    class BrokenSession:
        def execute(self, *args, **kwargs):
            raise SQLAlchemyError("database unavailable")

    app.dependency_overrides[get_db] = lambda: BrokenSession()

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["database"] == "error"
