from collections import deque
from threading import Lock
from time import monotonic
from uuid import UUID

from fastapi import HTTPException

ISSUE_CREATE_LIMIT = 10
ISSUE_CREATE_WINDOW_SECONDS = 3600

# ponytail: per-process in-memory limiter; move to Redis if multiple instances
# or a stricter shared quota is required.
_buckets: dict[UUID, deque[float]] = {}
_lock = Lock()


def enforce_issue_creation(user_id: UUID) -> None:
    now = monotonic()
    with _lock:
        bucket = _buckets.setdefault(user_id, deque())
        while bucket and now - bucket[0] >= ISSUE_CREATE_WINDOW_SECONDS:
            bucket.popleft()
        if len(bucket) >= ISSUE_CREATE_LIMIT:
            raise HTTPException(status_code=429, detail="Report creation rate limit exceeded")
        bucket.append(now)


def reset() -> None:
    with _lock:
        _buckets.clear()
