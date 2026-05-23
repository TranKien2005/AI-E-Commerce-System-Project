"""Buyer flow tests: profile, cart, orders, payment, reviews, notifications, reports, seller requests, chat."""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import login_token

B_EMAIL, B_PWD = "buyer@example.com", "Buyer@123"
A_EMAIL, A_PWD = "admin@example.com", "Admin@123"

def bh(c): return {"Authorization": f"Bearer {login_token(c, B_EMAIL, B_PWD)}"}
def ah(c): return {"Authorization": f"Bearer {login_token(c, A_EMAIL, A_PWD)}"}


class TestProfile:
    def test_get_me(self, client):
        d = client.get("/api/v1/users/me", headers=bh(client)).json()["data"]
        for k in ("id", "email", "full_name", "role"):
            assert k in d

    def test_update_me(self, client):
        assert client.put("/api/v1/users/me", json={"full_name": "Demo Buyer"}, headers=bh(client)).status_code == 200

    def test_no_auth(self, client):
        assert client.get("/api/v1/users/me").status_code == 401


class TestCart:
    def test_get_cart(self, client):
        assert client.get("/api/v1/cart", headers=bh(client)).status_code == 200

    def test_add_to_cart(self, client):
        items = client.get("/api/v1/products").json()["data"]["items"]
        p = next((i for i in items if i["stock"] >= 1), None)
        if not p: pytest.skip("No stock")
        assert client.post("/api/v1/cart/items", json={"product_id": p["id"], "quantity": 1}, headers=bh(client)).status_code == 201

    def test_add_invalid_product(self, client):
        assert client.post("/api/v1/cart/items", json={"product_id": 999999, "quantity": 1}, headers=bh(client)).status_code == 404

    def test_cart_fields(self, client):
        items = client.get("/api/v1/cart", headers=bh(client)).json()["data"]["items"]
        if items:
            for k in ("primary_image", "stock", "price", "name"):
                assert k in items[0]

    def test_update_cart_item(self, client):
        cart = client.get("/api/v1/cart", headers=bh(client)).json()["data"]["items"]
        if not cart: pytest.skip("Empty cart")
        r = client.put(f"/api/v1/cart/items/{cart[0]['item_id']}", json={"quantity": 1}, headers=bh(client))
        assert r.status_code == 200

    def test_delete_cart_item_404(self, client):
        assert client.delete("/api/v1/cart/items/999999", headers=bh(client)).status_code == 404


class TestOrders:
    def test_list_orders(self, client):
        r = client.get("/api/v1/orders/my", headers=bh(client))
        assert r.status_code == 200
        assert "meta" in r.json()["data"]

    def test_filter_by_status(self, client):
        r = client.get("/api/v1/orders/my", params={"status": "delivered"}, headers=bh(client))
        for o in r.json()["data"]["items"]:
            assert o["status"] == "delivered"

    def test_filter_by_date(self, client):
        r = client.get("/api/v1/orders/my", params={"from_date": "2020-01-01"}, headers=bh(client))
        assert r.status_code == 200

    def test_pagination(self, client):
        r = client.get("/api/v1/orders/my", params={"page": 1, "page_size": 2}, headers=bh(client))
        assert r.json()["data"]["meta"]["page_size"] == 2

    def test_order_detail(self, client):
        orders = client.get("/api/v1/orders/my", headers=bh(client)).json()["data"]["items"]
        if not orders: pytest.skip("No orders")
        r = client.get(f"/api/v1/orders/{orders[0]['id']}", headers=bh(client))
        d = r.json()["data"]
        for k in ("items", "shipping_address", "shipping_note", "total_price", "created_at"):
            assert k in d

    def test_order_detail_has_items(self, client):
        orders = client.get("/api/v1/orders/my", headers=bh(client)).json()["data"]["items"]
        if not orders: pytest.skip("No orders")
        d = client.get(f"/api/v1/orders/{orders[0]['id']}", headers=bh(client)).json()["data"]
        assert isinstance(d["items"], list)

    def test_order_404(self, client):
        assert client.get("/api/v1/orders/999999", headers=bh(client)).status_code == 404

    def test_cancel_delivered_fails(self, client):
        orders = client.get("/api/v1/orders/my", params={"status": "delivered"}, headers=bh(client)).json()["data"]["items"]
        if not orders: pytest.skip("No delivered orders")
        assert client.post(f"/api/v1/orders/{orders[0]['id']}/cancel", headers=bh(client)).status_code == 400


class TestPayment:
    def test_get_payment(self, client):
        orders = client.get("/api/v1/orders/my", headers=bh(client)).json()["data"]["items"]
        paid = next((o for o in orders if o["payment_status"] == "success"), None)
        if not paid: pytest.skip("No paid order")
        r = client.get(f"/api/v1/payments/{paid['id']}", headers=bh(client))
        for k in ("transaction_id", "method", "status"):
            assert k in r.json()["data"]

    def test_payment_404(self, client):
        assert client.get("/api/v1/payments/999999", headers=bh(client)).status_code == 404


class TestReviews:
    def test_invalid_rating(self, client):
        products = client.get("/api/v1/products").json()["data"]["items"]
        if not products: pytest.skip("No products")
        r = client.post("/api/v1/reviews", json={"product_id": products[0]["id"], "rating": 10, "comment": "bad"}, headers=bh(client))
        assert r.status_code == 422

    def test_review_no_purchase(self, client):
        r = client.post("/api/v1/reviews", json={"product_id": 999999, "rating": 5, "comment": "x"}, headers=bh(client))
        assert r.status_code in (403, 404)


class TestNotifications:
    def test_list(self, client):
        r = client.get("/api/v1/notifications", headers=bh(client))
        items = r.json()["data"]["items"]
        if items:
            for k in ("content", "type", "is_read", "created_at"):
                assert k in items[0]

    def test_mark_all_read(self, client):
        assert client.patch("/api/v1/notifications/read-all", headers=bh(client)).status_code == 200

    def test_mark_one_404(self, client):
        assert client.patch("/api/v1/notifications/999999/read", json={"is_read": True}, headers=bh(client)).status_code == 404


class TestReports:
    def test_create_report(self, client):
        assert client.post("/api/v1/reports", json={"target_type": "product", "target_id": 1, "reason": "spam"}, headers=bh(client)).status_code == 201


class TestSellerRequests:
    def test_my_request(self, client):
        assert client.get("/api/v1/seller-requests/me", headers=bh(client)).status_code == 200


class TestChat:
    def test_list_conversations(self, client):
        assert client.get("/api/v1/chat/conversations", headers=bh(client)).status_code == 200

    def test_full_chat_flow(self, client):
        users = client.get("/api/v1/admin/users", params={"role": "seller"}, headers=ah(client)).json()["data"]["items"]
        if not users: pytest.skip("No sellers")
        h = bh(client)
        # Create conversation
        r = client.post("/api/v1/chat/conversations", json={"seller_id": users[0]["id"]}, headers=h)
        assert r.status_code == 201
        cid = r.json()["data"]["id"]
        # Send message
        assert client.post(f"/api/v1/chat/conversations/{cid}/messages", json={"content": "Hi!"}, headers=h).status_code == 201
        # List messages
        msgs = client.get(f"/api/v1/chat/conversations/{cid}/messages", headers=h).json()["data"]["items"]
        assert len(msgs) >= 1
        # Mark read
        assert client.patch(f"/api/v1/chat/conversations/{cid}/read", headers=h).status_code == 200

    def test_conversation_404(self, client):
        assert client.get("/api/v1/chat/conversations/999999/messages", headers=bh(client)).status_code == 404
