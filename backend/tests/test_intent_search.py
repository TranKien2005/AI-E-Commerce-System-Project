import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.services.ai_service import cosine_similarity, mock_parse_intent, get_mock_embedding, MemoryVectorStore

def test_cosine_similarity():
    # Identical vectors
    v1 = [1.0, 2.0, 3.0]
    v2 = [1.0, 2.0, 3.0]
    assert abs(cosine_similarity(v1, v2) - 1.0) < 1e-6

    # Orthogonal vectors
    v3 = [1.0, 0.0, 0.0]
    v4 = [0.0, 1.0, 0.0]
    assert abs(cosine_similarity(v3, v4) - 0.0) < 1e-6

    # Empty or mismatch
    assert cosine_similarity([], []) == 0.0
    assert cosine_similarity([1.0], [1.0, 2.0]) == 0.0

def test_mock_intent_parser():
    categories = ["Laptop", "Điện thoại", "Thời trang", "Sách"]

    # Test category match and price range
    res1 = mock_parse_intent("Tìm laptop giá từ 10 triệu đến 20 triệu", categories)
    assert res1["category"] == "Laptop"
    assert res1["min_price"] == 10_000_000
    assert res1["max_price"] == 20_000_000

    # Test under/over price matches
    res2 = mock_parse_intent("điện thoại dưới 5tr giá rẻ nhất", categories)
    assert res2["category"] == "Điện thoại"
    assert res2["max_price"] == 5_000_000
    assert res2["sort"] == "price_asc"

    res3 = mock_parse_intent("sách trên 150k bán chạy", categories)
    assert res3["category"] == "Sách"
    assert res3["min_price"] == 150_000
    assert res3["sort"] == "popular"

    # Test query cleaning
    assert "laptop" not in res1["search_query"].lower()
    assert "từ 10 triệu đến 20 triệu" not in res1["search_query"].lower()

def test_memory_vector_store():
    store = MemoryVectorStore()
    
    # Add products
    store.add_product(1, "Dell XPS 13", "Ultrabook high performance thin and light", 10)
    store.add_product(2, "iPhone 15 Pro", "Apple flagship smartphone with dynamic island", 11)
    
    # Query similarity
    results1 = store.query_similarity("Flagship Apple phone")
    assert len(results1) > 0
    assert results1[0] == 2  # iPhone should be more similar than Dell
    
    results2 = store.query_similarity("thin dell laptop")
    assert len(results2) > 0
    assert results2[0] == 1  # Dell should be more similar

    # Delete product
    store.delete_product(1)
    results3 = store.query_similarity("thin dell laptop")
    assert 1 not in results3

def test_search_status_endpoint(client: TestClient):
    resp = client.get("/api/v1/products/search-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "status" in data["data"]

@patch("app.services.search_service.search_marketplace")
def test_intent_search_post_endpoint(mock_search, client: TestClient):
    mock_search.return_value = {
        "products": {
            "items": [],
            "meta": {"page": 1, "page_size": 10, "total": 0, "total_pages": 0},
            "is_fallback": True,
            "ai_parsed": None
        },
        "shops": {
            "items": [],
            "meta": {"page": 1, "page_size": 4, "total": 0, "total_pages": 0}
        }
    }
    payload = {
        "query": "laptop dell giá từ 10tr đến 20tr",
        "page": 1,
        "page_size": 10
    }
    resp = client.post("/api/v1/products/intent-search", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "items" in data["data"]
    assert "meta" in data["data"]

@patch("app.services.search_service.search_marketplace")
def test_search_type_ai_get_endpoint(mock_search, client: TestClient):
    mock_search.return_value = {
        "products": {
            "items": [],
            "meta": {"page": 1, "page_size": 20, "total": 0, "total_pages": 0},
            "is_fallback": True,
            "ai_parsed": None
        },
        "shops": {
            "items": [],
            "meta": {"page": 1, "page_size": 4, "total": 0, "total_pages": 0}
        }
    }
    resp = client.get("/api/v1/products?search_type=ai&q=điện thoại giá rẻ")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "items" in data["data"]
    assert "meta" in data["data"]

@patch("app.services.search_service.search_marketplace")
def test_edge_case_empty_and_excessive_query(mock_search, client: TestClient):
    mock_search.return_value = {
        "products": {
            "items": [],
            "meta": {"page": 1, "page_size": 20, "total": 0, "total_pages": 0},
            "is_fallback": True,
            "ai_parsed": None
        },
        "shops": {
            "items": [],
            "meta": {"page": 1, "page_size": 4, "total": 0, "total_pages": 0}
        }
    }
    # Empty query
    resp1 = client.get("/api/v1/products?search_type=ai&q=")
    assert resp1.status_code == 200
    
    # Very long query
    long_query = "dell " * 200
    resp2 = client.get(f"/api/v1/products?search_type=ai&q={long_query}")
    assert resp2.status_code == 200
