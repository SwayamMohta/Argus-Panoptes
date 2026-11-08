"""Time the read-only endpoints against the locally configured database.

Run from backend/:
    LOG_LEVEL=WARNING python -m scripts.perf_smoke
"""

import time

from fastapi.testclient import TestClient

from app.main import app

PATHS = (
    "/health",
    "/api/v1/categories",
    "/api/v1/notices",
    "/api/v1/wards?q=Kukatpally",
    "/api/v1/wards/boundaries?tolerance=0.0005",
    "/api/v1/issues?limit=20",
)

MAX_ACCEPTABLE_MS = 2000


def main() -> int:
    failed = False
    with TestClient(app) as client:
        for path in PATHS:
            started = time.perf_counter()
            response = client.get(path)
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            size = len(response.content)
            print(f"{response.status_code} {elapsed_ms:8.2f} ms {size:8} B {path}")
            if response.status_code >= 400 or elapsed_ms > MAX_ACCEPTABLE_MS:
                failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
