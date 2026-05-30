"""Seller management tests: shop, products, orders, chatbot, stats."""

import pytest
from tests.conftest import login_token

S_EMAIL, S_PWD = "seller@example.com", "Seller@123"
B_EMAIL, B_PWD = "buyer@example.com", "Buyer@123"


def sh(c):
    return {"Authorization": f"Bearer {login_token(c, S_EMAIL, S_PWD)}"}


def bh(c):
    return {"Authorization": f"Bearer {login_token(c, B_EMAIL, B_PWD)}"}


class TestSellerShop:
    def test_get_shop(self, client):
        d = client.get("/api/v1/seller/shop", headers=sh(client)).json()["data"]
        for k in ("id", "owner_id", "name", "description", "status", "created_at"):
            assert k in d

    def test_update_shop(self, client):
        assert (
            client.put(
                "/api/v1/seller/shop",
                json={"name": "Demo Shop", "description": "Updated"},
                headers=sh(client),
            ).status_code
            == 200
        )


class TestSellerProducts:
    def test_list_products(self, client):
        d = client.get("/api/v1/seller/products", headers=sh(client)).json()["data"]
        assert "meta" in d
        if d["items"]:
            p = d["items"][0]
            for k in (
                "description",
                "category_id",
                "attributes",
                "images",
                "created_at",
            ):
                assert k in p

    def test_list_pagination(self, client):
        r = client.get(
            "/api/v1/seller/products",
            params={"page": 1, "page_size": 1},
            headers=sh(client),
        )
        assert r.json()["data"]["meta"]["page_size"] == 1

    def test_create_product(self, client):
        r = client.post(
            "/api/v1/seller/products",
            json={"name": "TestProd", "description": "d", "price": 50000, "stock": 10},
            headers=sh(client),
        )
        assert r.status_code == 201
        assert "id" in r.json()["data"]

    def test_update_product(self, client):
        h = sh(client)
        r = client.post(
            "/api/v1/seller/products",
            json={"name": "UpdProd", "description": "d", "price": 50000, "stock": 5},
            headers=h,
        )
        pid = r.json()["data"]["id"]
        r = client.put(
            f"/api/v1/seller/products/{pid}",
            json={"name": "Updated", "description": "d2", "price": 60000, "stock": 8},
            headers=h,
        )
        assert r.status_code == 200

    def test_soft_delete_product(self, client):
        h = sh(client)
        r = client.post(
            "/api/v1/seller/products",
            json={"name": "DelProd", "description": "d", "price": 10000, "stock": 1},
            headers=h,
        )
        pid = r.json()["data"]["id"]
        assert (
            client.delete(f"/api/v1/seller/products/{pid}", headers=h).status_code
            == 204
        )
        ids = [
            p["id"]
            for p in client.get("/api/v1/seller/products", headers=h).json()["data"][
                "items"
            ]
        ]
        assert pid not in ids

    def test_update_nonexistent_product(self, client):
        r = client.put(
            "/api/v1/seller/products/999999",
            json={"name": "X", "description": "d", "price": 1, "stock": 1},
            headers=sh(client),
        )
        assert r.status_code == 404

    def test_delete_nonexistent_product(self, client):
        assert (
            client.delete(
                "/api/v1/seller/products/999999", headers=sh(client)
            ).status_code
            == 404
        )


class TestSellerOrders:
    def test_list_orders(self, client):
        d = client.get("/api/v1/seller/orders", headers=sh(client)).json()["data"]
        assert "meta" in d
        if d["items"]:
            o = d["items"][0]
            for k in (
                "buyer_name",
                "buyer_email",
                "payment_status",
                "total_price",
                "items",
                "created_at",
            ):
                assert k in o

    def test_order_items_detail(self, client):
        d = client.get("/api/v1/seller/orders", headers=sh(client)).json()["data"]
        if d["items"]:
            order = d["items"][0]
            assert isinstance(order["items"], list)
            if order["items"]:
                for k in ("id", "product_id", "quantity", "price"):
                    assert k in order["items"][0]

    def test_get_single_order(self, client):
        d = client.get("/api/v1/seller/orders", headers=sh(client)).json()["data"]
        if not d["items"]:
            pytest.skip("No orders")
        r = client.get(
            f"/api/v1/seller/orders/{d['items'][0]['id']}", headers=sh(client)
        )
        assert r.status_code == 200
        assert "buyer_name" in r.json()["data"]

    def test_order_404(self, client):
        assert (
            client.get("/api/v1/seller/orders/999999", headers=sh(client)).status_code
            == 404
        )

    def test_invalid_status_transition(self, client):
        d = client.get("/api/v1/seller/orders", headers=sh(client)).json()["data"]
        delivered = next((o for o in d["items"] if o["status"] == "delivered"), None)
        if not delivered:
            pytest.skip("No delivered order")
        r = client.patch(
            f"/api/v1/seller/orders/{delivered['id']}",
            json={"status": "pending"},
            headers=sh(client),
        )
        assert r.status_code == 400


class TestChatbotConfig:
    def test_get_config(self, client):
        d = client.get("/api/v1/seller/chatbot-config", headers=sh(client)).json()[
            "data"
        ]
        for k in ("api_key", "prompt", "template", "is_enabled"):
            assert k in d

    def test_api_key_masked(self, client):
        d = client.get("/api/v1/seller/chatbot-config", headers=sh(client)).json()[
            "data"
        ]
        assert "..." in d["api_key"] or "***" in d["api_key"]

    def test_update_config(self, client):
        assert (
            client.patch(
                "/api/v1/seller/chatbot-config",
                json={
                    "api_key": "sk-test-newkey1234567",
                    "prompt": "hi",
                    "template": "v2",
                    "is_enabled": True,
                },
                headers=sh(client),
            ).status_code
            == 200
        )


class TestSellerStats:
    def test_stats(self, client):
        d = client.get("/api/v1/seller/stats", headers=sh(client)).json()["data"]
        for k in ("revenue", "orders", "best_selling"):
            assert k in d
        assert isinstance(d["best_selling"], list)

    def test_stats_with_dates(self, client):
        r = client.get(
            "/api/v1/seller/stats",
            params={"from_date": "2020-01-01", "to_date": "2030-12-31"},
            headers=sh(client),
        )
        assert r.status_code == 200


class TestSellerRoleGuard:
    def test_buyer_cannot_access(self, client):
        assert client.get("/api/v1/seller/shop", headers=bh(client)).status_code == 403

    def test_no_auth(self, client):
        assert client.get("/api/v1/seller/shop").status_code == 401
