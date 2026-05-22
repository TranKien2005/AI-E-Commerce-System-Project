import pytest

from app.core.circuit_breaker import CircuitBreaker, CircuitBreakerOpen


def test_circuit_breaker_opens_after_failures():
    breaker = CircuitBreaker("test", failure_threshold=2, recovery_seconds=60)

    def fail():
        raise ValueError("boom")

    with pytest.raises(ValueError):
        breaker.call(fail)
    with pytest.raises(ValueError):
        breaker.call(fail)
    with pytest.raises(CircuitBreakerOpen):
        breaker.call(lambda: True)


def test_circuit_breaker_can_trip_on_false():
    breaker = CircuitBreaker("test", failure_threshold=1, recovery_seconds=60, trip_on_false=True)

    assert breaker.call(lambda: False) is False
    with pytest.raises(CircuitBreakerOpen):
        breaker.call(lambda: True)
