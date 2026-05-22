import logging
import time
from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, TypeVar

from app.core.config import settings


logger = logging.getLogger(__name__)
P = ParamSpec("P")
R = TypeVar("R")


class CircuitBreakerOpen(RuntimeError):
    pass


class CircuitBreaker:
    def __init__(self, name: str, failure_threshold: int | None = None, recovery_seconds: int | None = None, trip_on_false: bool = False):
        self.name = name
        self.failure_threshold = failure_threshold or settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD
        self.recovery_seconds = recovery_seconds or settings.CIRCUIT_BREAKER_RECOVERY_SECONDS
        self.trip_on_false = trip_on_false
        self.failures = 0
        self.opened_at: float | None = None

    def call(self, fn: Callable[P, R], *args: P.args, **kwargs: P.kwargs) -> R:
        if self.opened_at is not None:
            if time.monotonic() - self.opened_at < self.recovery_seconds:
                logger.warning("circuit_breaker_open", extra={"path": self.name})
                raise CircuitBreakerOpen(f"Circuit breaker is open: {self.name}")
            self.opened_at = None
        try:
            result = fn(*args, **kwargs)
        except Exception:
            self._record_failure()
            raise
        if self.trip_on_false and result is False:
            self._record_failure()
            return result
        self.failures = 0
        return result

    def _record_failure(self) -> None:
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.opened_at = time.monotonic()
            logger.error("circuit_breaker_tripped", extra={"path": self.name})


def circuit_breaker(name: str, failure_threshold: int | None = None, recovery_seconds: int | None = None, trip_on_false: bool = False):
    breaker = CircuitBreaker(name, failure_threshold, recovery_seconds, trip_on_false)

    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        @wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            return breaker.call(fn, *args, **kwargs)

        return wrapper

    return decorator
