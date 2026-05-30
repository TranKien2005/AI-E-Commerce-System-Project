"""Admin endpoint tests: users, seller requests, reports, audit logs, metrics."""

import pytest
from tests.conftest import login_token

A_EMAIL, A_PWD = "admin@example.com", "Admin@123"
B_EMAIL, B_PWD = "buyer@example.com", "Buyer@123"


def ah(c):
    return {"Authorization": f"Bearer {login_token(c, A_EMAIL, A_PWD)}"}


def bh(c):
    return {"Authorization": f"Bearer {login_token(c, B_EMAIL, B_PWD)}"}


class TestAdminUsers:
    def test_list_users(self, client):
        d = client.get("/api/v1/admin/users", headers=ah(client)).json()["data"]
        assert "items" in d and "meta" in d

    def test_filter_by_role(self, client):
        r = client.get(
            "/api/v1/admin/users", params={"role": "buyer"}, headers=ah(client)
        )
        for u in r.json()["data"]["items"]:
            assert u["role"] == "buyer"

    def test_filter_by_keyword(self, client):
        r = client.get(
            "/api/v1/admin/users", params={"keyword": "buyer"}, headers=ah(client)
        )
        assert r.status_code == 200

    def test_pagination(self, client):
        r = client.get(
            "/api/v1/admin/users",
            params={"page": 1, "page_size": 1},
            headers=ah(client),
        )
        assert r.json()["data"]["meta"]["page_size"] == 1

    def test_patch_user(self, client):
        users = client.get(
            "/api/v1/admin/users", params={"role": "buyer"}, headers=ah(client)
        ).json()["data"]["items"]
        if not users:
            pytest.skip("No buyers")
        assert (
            client.patch(
                f"/api/v1/admin/users/{users[0]['id']}",
                json={"status": "active"},
                headers=ah(client),
            ).status_code
            == 200
        )

    def test_patch_user_404(self, client):
        assert (
            client.patch(
                "/api/v1/admin/users/999999",
                json={"status": "active"},
                headers=ah(client),
            ).status_code
            == 404
        )


class TestAdminSellerRequests:
    def test_list(self, client):
        r = client.get("/api/v1/admin/seller-requests", headers=ah(client))
        assert r.status_code == 200
        if r.json()["data"]["items"]:
            i = r.json()["data"]["items"][0]
            for k in ("id", "user_id", "shop_name", "status"):
                assert k in i

    def test_patch_not_found(self, client):
        r = client.patch(
            "/api/v1/admin/seller-requests/999999",
            json={"action": "approve", "reason": ""},
            headers=ah(client),
        )
        assert r.status_code == 404

    def test_patch_invalid_action(self, client):
        reqs = client.get("/api/v1/admin/seller-requests", headers=ah(client)).json()[
            "data"
        ]["items"]
        pending = next((r for r in reqs if r["status"] == "pending"), None)
        if not pending:
            pytest.skip("No pending requests")
        r = client.patch(
            f"/api/v1/admin/seller-requests/{pending['id']}",
            json={"action": "invalid", "reason": ""},
            headers=ah(client),
        )
        assert r.status_code == 400


class TestAdminReports:
    def test_list_reports(self, client):
        assert (
            client.get("/api/v1/admin/reports", headers=ah(client)).status_code == 200
        )

    def test_patch_report_uses_body(self, client):
        """PATCH /reports/{id} should use JSON body, not query param."""
        r = client.patch(
            "/api/v1/admin/reports/999999",
            json={"status": "resolved"},
            headers=ah(client),
        )
        assert r.status_code == 404  # not 422

    def test_patch_existing_report(self, client):
        reports = client.get("/api/v1/admin/reports", headers=ah(client)).json()[
            "data"
        ]["items"]
        if not reports:
            pytest.skip("No reports")
        r = client.patch(
            f"/api/v1/admin/reports/{reports[0]['id']}",
            json={"status": "resolved"},
            headers=ah(client),
        )
        assert r.status_code == 200


class TestAdminAuditLogs:
    def test_audit_logs(self, client):
        r = client.get("/api/v1/admin/audit-logs", headers=ah(client))
        assert r.status_code == 200
        assert "items" in r.json()["data"]


class TestAdminMetricsLogs:
    def test_metrics(self, client):
        assert (
            client.get("/api/v1/admin/metrics", headers=ah(client)).status_code == 200
        )

    def test_logs(self, client):
        assert client.get("/api/v1/admin/logs", headers=ah(client)).status_code == 200


class TestAdminRoleGuard:
    def test_buyer_cannot_access(self, client):
        assert client.get("/api/v1/admin/users", headers=bh(client)).status_code == 403

    def test_no_auth(self, client):
        assert client.get("/api/v1/admin/users").status_code == 401
