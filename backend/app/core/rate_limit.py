"""Minimal in-memory sliding-window rate limiter for auth endpoints.

Not a substitute for a shared limiter (e.g. Redis-backed) behind multiple app
processes/instances, but it stops naive single-process brute-force / credential
stuffing against /auth/login and /auth/register without adding a new dependency.
"""
import time
from collections import defaultdict, deque

_WINDOW_SECONDS = 15 * 60
_MAX_ATTEMPTS = 10

_attempts: dict[str, deque[float]] = defaultdict(deque)


def check_rate_limit(
    key: str,
    max_attempts: int = _MAX_ATTEMPTS,
    window_seconds: int = _WINDOW_SECONDS,
    record: bool = True,
) -> bool:
    """Returns False if `key` has already hit `max_attempts` within the window.

    When `record` is True (the default) this call itself also counts as an attempt.
    Pass `record=False` to only check the current count without consuming budget —
    useful for checking the limit before knowing whether an attempt will "count"
    (e.g. only failed logins should consume budget).
    """
    now = time.time()
    bucket = _attempts[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= max_attempts:
        return False
    if record:
        bucket.append(now)
    return True
