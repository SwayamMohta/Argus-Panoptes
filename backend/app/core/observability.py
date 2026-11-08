import json
import logging
import re
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("argus.request")
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def new_request_id(value: str | None) -> str:
    if value and _SAFE_REQUEST_ID.fullmatch(value):
        return value
    return uuid.uuid4().hex


def get_request_id() -> str:
    return request_id_ctx.get()


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "requestId": get_request_id(),
        }
        for field in ("method", "path", "status", "durationMs"):
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a request id to logs and the response. Never logs query strings."""

    async def dispatch(self, request: Request, call_next):
        request_id = new_request_id(request.headers.get("X-Request-ID"))
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            logger.info(
                "request",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status": status,
                    "durationMs": round((time.perf_counter() - started) * 1000, 2),
                },
            )
            request_id_ctx.reset(token)
