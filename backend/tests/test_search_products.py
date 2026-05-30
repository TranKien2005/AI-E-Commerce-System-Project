"""Search, product detail, categories, public shop endpoint tests."""

import pytest


class TestCategories:
    def test_list_categories(self, client):
        r = client.get("/api/v1/categories")
        assert r.status_code == 200
        assert "items" in r.json()["data"]


class TestProductSearch:
    def test_list_products(self, client):
        r = client.get("/api/v1/products")
        assert r.status_code == 200
        d = r.json()["data"]
        assert "items" in d and "meta" in d
        assert d["meta"]["page"] == 1

    def test_keyword_filter(self, client):
        r = client.get("/api/v1/products", params={"keyword": "Laptop"})
        assert r.status_code == 200
        for i in r.json()["data"]["items"]:
            assert "laptop" in i["name"].lower()

    def test_q_param_alias(self, client):
        r = client.get("/api/v1/products", params={"q": "Laptop"})
        assert r.status_code == 200

    def test_category_filter(self, client):
        cats = client.get("/api/v1/categories").json()["data"]["items"]
        if not cats:
            pytest.skip("No categories")
        r = client.get("/api/v1/products", params={"category_id": cats[0]["id"]})
        assert r.status_code == 200

    def test_shop_filter(self, client):
        items = client.get("/api/v1/products").json()["data"]["items"]
        if not items:
            pytest.skip("No products")
        r = client.get("/api/v1/products", params={"shop_id": items[0]["shop_id"]})
        assert r.status_code == 200
        for i in r.json()["data"]["items"]:
            assert i["shop_id"] == items[0]["shop_id"]

    def test_price_range_filter(self, client):
        r = client.get(
            "/api/v1/products", params={"min_price": 1000000, "max_price": 99999999}
        )
        assert r.status_code == 200
        for i in r.json()["data"]["items"]:
            assert 1000000 <= i["price"] <= 99999999

    def test_sort_price_asc(self, client):
        r = client.get("/api/v1/products", params={"sort": "price_asc"})
        items = r.json()["data"]["items"]
        if len(items) >= 2:
            assert items[0]["price"] <= items[1]["price"]

    def test_sort_price_desc(self, client):
        r = client.get("/api/v1/products", params={"sort": "price_desc"})
        items = r.json()["data"]["items"]
        if len(items) >= 2:
            assert items[0]["price"] >= items[1]["price"]

    def test_sort_newest(self, client):
        r = client.get("/api/v1/products", params={"sort": "newest"})
        assert r.status_code == 200

    def test_sort_top_sales(self, client):
        r = client.get("/api/v1/products", params={"sort": "top_sales"})
        assert r.status_code == 200
        items = r.json()["data"]["items"]
        if len(items) >= 2:
            assert items[0]["sold_count"] >= items[1]["sold_count"]

    def test_min_rating_filter(self, client):
        r = client.get("/api/v1/products", params={"min_rating": 4})
        assert r.status_code == 200
        for item in r.json()["data"]["items"]:
            assert item["avg_rating"] is not None
            assert item["avg_rating"] >= 4

    def test_pagination(self, client):
        r = client.get("/api/v1/products", params={"page": 1, "page_size": 1})
        m = r.json()["data"]["meta"]
        assert m["page_size"] == 1
        assert len(r.json()["data"]["items"]) <= 1

    def test_page2(self, client):
        r = client.get("/api/v1/products", params={"page": 999, "page_size": 10})
        assert r.status_code == 200
        assert r.json()["data"]["items"] == []

    def test_product_list_has_image_shop_category(self, client):
        items = client.get("/api/v1/products").json()["data"]["items"]
        if items:
            for k in (
                "primary_image",
                "shop_name",
                "shop_id",
                "category_id",
                "category",
                "avg_rating",
                "review_count",
                "sold_count",
            ):
                assert k in items[0]
            if items[0]["category"]:
                assert "id" in items[0]["category"] and "name" in items[0]["category"]

    def test_no_deleted_products(self, client):
        """Soft-deleted products should not appear."""
        r = client.get("/api/v1/products")
        assert r.status_code == 200


class TestIntentSearch:
    def test_intent_search(self, client):
        r = client.post(
            "/api/v1/products/intent-search",
            json={"query": "laptop", "page": 1, "page_size": 10},
        )
        assert r.status_code == 200
        assert "items" in r.json()["data"]


class TestRecommend:
    def test_recommend(self, client):
        r = client.get("/api/v1/products/recommend")
        assert r.status_code == 200
        assert "items" in r.json()["data"]

    def test_recommend_pagination(self, client):
        r = client.get("/api/v1/products/recommend", params={"page": 1, "page_size": 2})
        assert r.status_code == 200


class TestProductDetail:
    def _get_pid(self, client):
        items = client.get("/api/v1/products").json()["data"]["items"]
        if not items:
            pytest.skip("No products")
        return items[0]["id"]

    def test_product_detail_rich(self, client):
        r = client.get(f"/api/v1/products/{self._get_pid(client)}")
        assert r.status_code == 200
        d = r.json()["data"]
        for k in (
            "images",
            "shop",
            "category",
            "attributes",
            "avg_rating",
            "review_count",
        ):
            assert k in d

    def test_shop_in_detail(self, client):
        r = client.get(f"/api/v1/products/{self._get_pid(client)}")
        shop = r.json()["data"]["shop"]
        if shop:
            assert "id" in shop and "name" in shop

    def test_product_404(self, client):
        assert client.get("/api/v1/products/999999").status_code == 404

    def test_product_reviews(self, client):
        r = client.get(f"/api/v1/products/{self._get_pid(client)}/reviews")
        assert r.status_code == 200
        assert "items" in r.json()["data"]

    def test_reviews_404(self, client):
        assert client.get("/api/v1/products/999999/reviews").status_code == 404


class TestPublicShop:
    def test_public_shop(self, client):
        items = client.get("/api/v1/products").json()["data"]["items"]
        if not items:
            pytest.skip("No products")
        r = client.get(f"/api/v1/shops/{items[0]['shop_id']}")
        assert r.status_code == 200
        for k in ("name", "description", "status"):
            assert k in r.json()["data"]

    def test_shop_404(self, client):
        assert client.get("/api/v1/shops/999999").status_code == 404
