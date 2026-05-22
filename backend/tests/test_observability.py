from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.rate_limit import setup_rate_limit
from tests.conftest import login_token


A_EMAIL, A_PWD = "admin@example.com", "Admin@123"


def ah(client):
    return {"Authorization": f"Bearer {login_token(client, A_EMAIL, A_PWD)}"}


def test_prometheus_metrics_endpoint(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert "http_requests_total" in response.text


def test_successful_mutation_creates_audit_log(client):
    headers = ah(client)
    before = client.get("/api/v1/admin/audit-logs", headers=headers).json()["data"]["items"]
    response = client.patch("/api/v1/admin/users/999999", json={"status": "active"}, headers=headers)
    assert response.status_code == 404
    after_failed = client.get("/api/v1/admin/audit-logs", headers=headers).json()["data"]["items"]
    assert len(after_failed) == len(before)

    users = client.get("/api/v1/admin/users", params={"role": "buyer"}, headers=headers).json()["data"]["items"]
    assert users
    response = client.patch(f"/api/v1/admin/users/{users[0]['id']}", json={"status": "active"}, headers=headers)
    assert response.status_code == 200
    after_success = client.get("/api/v1/admin/audit-logs", headers=headers).json()["data"]["items"]
    assert len(after_success) > len(after_failed)


def test_rate_limit_returns_429():
    app = FastAPI()
    setup_rate_limit(app)

    @app.get("/limited")
    def limited():
        return {"ok": True}

    client = TestClient(app)
    for _ in range(100):
        assert client.get("/limited").status_code == 200
    assert client.get("/limited").status_code == 429
