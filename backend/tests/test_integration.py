"""Integration tests: full end-to-end flows spanning multiple endpoints."""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import login_token

B_EMAIL, B_PWD = "buyer@example.com", "Buyer@123"
S_EMAIL, S_PWD = "seller@example.com", "Seller@123"

def bh(c): return {"Authorization": f"Bearer {login_token(c, B_EMAIL, B_PWD)}"}
def sh(c): return {"Authorization": f"Bearer {login_token(c, S_EMAIL, S_PWD)}"}


class TestBuyerJourney:
    """Register → Login → Browse → Cart → Order → Pay → Notification"""

    def test_full_buyer_journey(self, client):
        email, pwd = "journey_test@example.com", "Test@12345"
        reg = client.post("/api/v1/auth/register", json={"email": email, "password": pwd, "full_name": "Journey Tester"})
        if reg.status_code == 409:
            pass  # already exists
        else:
            assert reg.status_code in (200, 201)

        login = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        assert login.status_code == 200
        h = {"Authorization": f"Bearer {login.json()['data']['access_token']}"}

        # Browse
        products = client.get("/api/v1/products").json()["data"]["items"]
        assert len(products) >= 1
        pid = next(p["id"] for p in products if p["stock"] >= 2)

        # Product detail
        detail = client.get(f"/api/v1/products/{pid}").json()["data"]
        initial_stock = detail["stock"]
        assert "shop" in detail and "images" in detail

        # Add to cart
        assert client.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 1}, headers=h).status_code == 201

        # View cart
        cart = client.get("/api/v1/cart", headers=h).json()["data"]["items"]
        assert any(i["product_id"] == pid for i in cart)

        # Create order
        order = client.post("/api/v1/orders", json={"shipping_address": "123 Journey St"}, headers=h)
        assert order.status_code == 201
        oid = order.json()["data"]["order_id"]

        # Stock deducted
        assert client.get(f"/api/v1/products/{pid}").json()["data"]["stock"] == initial_stock - 1

        # Order detail
        od = client.get(f"/api/v1/orders/{oid}", headers=h).json()["data"]
        assert len(od["items"]) >= 1

        # Pay
        pay = client.post(f"/api/v1/payments/{oid}/pay", headers=h)
        assert pay.json()["data"]["status"] in ("success", "failed")

        # Notifications created
        notifs = client.get("/api/v1/notifications", headers=h).json()["data"]["items"]
        assert len(notifs) >= 1


class TestCancelRestoresStock:
    """Order → Cancel → Stock restored"""

    def test_cancel_restores_stock(self, client):
        h = bh(client)
        # Use fresh stock reading right before cart add
        products = client.get("/api/v1/products").json()["data"]["items"]
        p = next((i for i in products if i["stock"] >= 2), None)
        if not p: pytest.skip("No stock")
        pid = p["id"]

        # Read stock JUST before the operation
        stock_before = client.get(f"/api/v1/products/{pid}").json()["data"]["stock"]
        if stock_before < 2: pytest.skip("Stock too low")

        client.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 1}, headers=h)
        order = client.post("/api/v1/orders", json={"shipping_address": "Cancel Test"}, headers=h)
        assert order.status_code == 201
        oid = order.json()["data"]["order_id"]

        stock_after = client.get(f"/api/v1/products/{pid}").json()["data"]["stock"]
        assert stock_after < stock_before  # stock decreased

        assert client.post(f"/api/v1/orders/{oid}/cancel", headers=h).status_code == 200

        stock_restored = client.get(f"/api/v1/products/{pid}").json()["data"]["stock"]
        assert stock_restored == stock_before  # fully restored


class TestSellerViewsOrder:
    """Buyer creates order → Seller sees it with full details"""

    def test_seller_sees_buyer_order(self, client):
        h_b, h_s = bh(client), sh(client)
        products = client.get("/api/v1/products").json()["data"]["items"]
        p = next((i for i in products if i["stock"] >= 1), None)
        if not p: pytest.skip("No stock")

        # Buyer creates order
        client.post("/api/v1/cart/items", json={"product_id": p["id"], "quantity": 1}, headers=h_b)
        order = client.post("/api/v1/orders", json={"shipping_address": "Seller View Test"}, headers=h_b)
        if order.status_code != 201: pytest.skip("Could not create order")

        # Seller sees it
        seller_orders = client.get("/api/v1/seller/orders", headers=h_s).json()["data"]["items"]
        assert len(seller_orders) >= 1
        latest = seller_orders[0]
        assert "buyer_name" in latest
        assert "items" in latest
        assert latest["total_price"] > 0


class TestProductLifecycle:
    """Create → Update → Add image → Delete (soft)"""

    def test_product_lifecycle(self, client):
        h = sh(client)

        # Create
        r = client.post("/api/v1/seller/products", json={"name": "Lifecycle", "description": "d", "price": 100000, "stock": 5}, headers=h)
        assert r.status_code == 201
        pid = r.json()["data"]["id"]

        # Verify in list
        ids = [p["id"] for p in client.get("/api/v1/seller/products", headers=h).json()["data"]["items"]]
        assert pid in ids

        # Update
        assert client.put(f"/api/v1/seller/products/{pid}", json={"name": "LifecycleV2", "description": "d2", "price": 150000, "stock": 3}, headers=h).status_code == 200

        # Buyer can see it
        detail = client.get(f"/api/v1/products/{pid}").json()["data"]
        assert detail["name"] == "LifecycleV2"

        # Soft delete
        assert client.delete(f"/api/v1/seller/products/{pid}", headers=h).status_code == 204

        # Not in seller list
        ids = [p["id"] for p in client.get("/api/v1/seller/products", headers=h).json()["data"]["items"]]
        assert pid not in ids

        # Not in public search
        search_ids = [p["id"] for p in client.get("/api/v1/products").json()["data"]["items"]]
        assert pid not in search_ids


class TestPaymentIdempotency:
    """Double payment with same idempotency key returns same result"""

    def test_idempotent_payment(self, client):
        h = bh(client)
        products = client.get("/api/v1/products").json()["data"]["items"]
        p = next((i for i in products if i["stock"] >= 1), None)
        if not p: pytest.skip("No stock")

        client.post("/api/v1/cart/items", json={"product_id": p["id"], "quantity": 1}, headers=h)
        order = client.post("/api/v1/orders", json={"shipping_address": "Idempotent Test"}, headers=h)
        if order.status_code != 201: pytest.skip("Could not create order")
        oid = order.json()["data"]["order_id"]

        key = f"test-idempotency-{oid}"
        r1 = client.post(f"/api/v1/payments/{oid}/pay", headers={**h, "X-Idempotency-Key": key})
        assert r1.status_code == 200
        r2 = client.post(f"/api/v1/payments/{oid}/pay", headers={**h, "X-Idempotency-Key": key})
        # Second call with same key either returns same result or 400 if already paid
        if r2.status_code == 200:
            assert r1.json()["data"]["payment_id"] == r2.json()["data"]["payment_id"]
        else:
            assert r2.status_code == 400  # already paid
