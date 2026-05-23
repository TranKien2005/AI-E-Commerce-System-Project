import pybreaker

from app.core.config import settings


email_circuit_breaker = pybreaker.CircuitBreaker(
    fail_max=settings.CIRCUIT_BREAKER_FAIL_MAX,
    reset_timeout=settings.CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS,
)
