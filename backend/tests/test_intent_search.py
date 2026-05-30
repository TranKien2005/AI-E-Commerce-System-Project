"""Bộ kiểm thử đơn vị và kiểm thử tích hợp cho hệ thống tìm kiếm theo ý định.

Tập trung kiểm thử các tầng xử lý nòng cốt bao gồm: thuật toán tách lọc văn bản thô
bằng biểu thức chính quy, cơ chế gọi mô hình ngôn ngữ lớn LLM bất đồng bộ, chuỗi
chuyển tiếp mô hình dự phòng (fallback chain), và tối ưu hóa chi phí qua bộ nhớ đệm.
"""

import json
from unittest.mock import AsyncMock, patch
import pytest
from httpx import Response

from app.services.ai_service import mock_parse_intent, parse_intent


# ==============================================================================
# 1. UNIT TESTS: REGEX-BASED INTENT PARSING (MOCK_PARSE_INTENT)
# ==============================================================================


def test_mock_intent_parse_price_ranges():
    """Kiểm thử khả năng bóc tách dải giá từ chuỗi truy vấn thô.

    Xác thực hệ thống trích xuất chính xác giá trị số từ cấu trúc cú pháp
    'từ X đến Y' với các loại cấu hình chữ viết tắt mệnh giá phổ biến trong
    ngôn ngữ tự nhiên thương mại điện tử (ví dụ: triệu, tr, k).
    """
    categories = ["Laptop", "Điện thoại"]

    # Kiểm thử bóc tách mệnh giá lớn với hậu tố định danh "triệu" và "tr"
    res_1 = mock_parse_intent("Tìm laptop giá từ 15 triệu đến 25tr", categories)
    assert res_1["min_price"] == 15_000_000
    assert res_1["max_price"] == 25_000_000

    # Kiểm thử bóc tách mệnh giá nhỏ với hậu tố định danh "k" (ngàn)
    res_2 = mock_parse_intent("áo thun từ 150k - 300k", categories)
    assert res_2["min_price"] == 150_000
    assert res_2["max_price"] == 300_000


def test_mock_intent_parse_price_boundaries():
    """Kiểm thử khả năng nhận diện các điều kiện biên giá trần và giá sàn.

    Xác thực các cấu trúc câu đặc thù chứa từ khóa 'dưới', 'tối đa' (giá trần)
    hoặc từ khóa 'trên', 'tối thiểu' (giá sàn) được chuyển đổi chính xác sang
    định dạng float để cấu hình mệnh đề WHERE cho SQL.
    """
    categories = ["Giày", "Đồng hồ"]

    # Kiểm thử trích xuất giá trị trần (chỉ có max_price, min_price giữ giá trị rỗng)
    res_under = mock_parse_intent("Đồng hồ thông minh dưới 4.5 triệu", categories)
    assert res_under["max_price"] == 4_500_000
    assert res_under["min_price"] is None

    # Kiểm thử trích xuất giá trị sàn (chỉ có min_price, max_price giữ giá trị rỗng)
    res_over = mock_parse_intent("Giày chạy bộ trên 1tr200k", categories)
    assert res_over["min_price"] == 1_200_000
    assert res_over["max_price"] is None


def test_mock_intent_parse_sorting_keywords():
    """Kiểm thử việc nhận diện từ khóa phân loại tiêu chí sắp xếp kết quả.

    Xác thực ngữ nghĩa hội thoại của khách hàng được phân loại chính xác về các
    định danh sắp xếp hệ thống như 'price_asc', 'price_desc', 'popular', và 'newest'.
    """
    categories = ["Mỹ phẩm"]

    assert mock_parse_intent("Mỹ phẩm rẻ nhất", categories)["sort"] == "price_asc"
    assert mock_parse_intent("Son môi đắt nhất", categories)["sort"] == "price_desc"
    assert mock_parse_intent("Kem chống nắng bán chạy", categories)["sort"] == "popular"
    assert mock_parse_intent("Nước hoa mới về", categories)["sort"] == "newest"


def test_mock_intent_query_cleaning():
    """Xác thực bộ lọc dọn dẹp nội dung chuỗi tìm kiếm văn bản.

    Đảm bảo sau khi xử lý phân tách intent, chuỗi tìm kiếm thô ban đầu phải được
    bóc tách sạch các token bộ lọc (khoảng giá, từ khóa sort, tên danh mục) nhằm
    giữ lại các thực thể mô tả cốt lõi tối ưu cho giải thuật so khớp không gian Vector.
    """
    categories = ["Điện thoại"]
    raw_query = "Mua điện thoại iphone 15 pro max dưới 30 triệu rẻ nhất"

    res = mock_parse_intent(raw_query, categories)
    clean_query = res["search_query"].lower()

    # Chuỗi tìm kiếm sau xử lý không được chứa các từ khóa bộ lọc bổ trợ
    assert "điện thoại" not in clean_query
    assert "dưới 30 triệu" not in clean_query
    assert "rẻ nhất" not in clean_query
    # Chuỗi tìm kiếm bắt buộc phải giữ lại định danh sản phẩm chi tiết
    assert "iphone 15 pro max" in clean_query


# ==============================================================================
# 2. ASYNC TESTS: LLM INTENT PARSING WITH GEMINI API (PARSE_INTENT)
# ==============================================================================


@pytest.mark.anyio
@patch("app.services.ai_service.cache.get", new_callable=AsyncMock)
@patch("httpx.AsyncClient.post", new_callable=AsyncMock)
async def test_parse_intent_success_via_llm(mock_post, mock_cache_get):
    """Kiểm thử luồng phân tích ý định thành công thông qua mô hình LLM trực tuyến.

    Xác thực kịch bản hệ thống gửi gói tin, nhận chuỗi cấu trúc JSON hợp lệ từ
    phản hồi của Gemini API, chuyển đổi các thực thể văn bản và tự động ghi nhớ
    kết quả vào hệ thống Caching Redis.

    Args:
        mock_post: Đối tượng giả lập phương thức POST bất đồng bộ của lớp httpx.
        mock_cache_get: Đối tượng giả lập lệnh đọc dữ liệu từ kho lưu trữ cache.
    """
    categories = ["Laptop", "Máy tính bảng"]
    mock_cache_get.return_value = None

    # Khởi tạo dữ liệu JSON giả lập phản hồi thành công từ Google Gemini Gateway
    gemini_json_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "category": "Laptop",
                                    "min_price": 20000000,
                                    "max_price": 30000000,
                                    "sort": "popular",
                                    "search_query": "macbook air m2",
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }
    mock_post.return_value = Response(200, json=gemini_json_response)

    with patch(
        "app.services.ai_service.cache.set", new_callable=AsyncMock
    ) as mock_cache_set:
        result = await parse_intent(
            "Cần mua macbook air m2 từ 20-30tr hot nhất", categories
        )

    assert result["is_fallback"] is False
    assert result["category"] == "Laptop"
    assert result["min_price"] == 20_000_000
    assert result["search_query"] == "macbook air m2"
    # Xác thực hệ thống kích hoạt lưu cache tự động sau khi LLM phản hồi thành công
    assert mock_cache_set.called


@pytest.mark.anyio
@patch("app.services.ai_service.cache.get", new_callable=AsyncMock)
@patch("httpx.AsyncClient.post", new_callable=AsyncMock)
async def test_parse_intent_model_fallback_chain(mock_post, mock_cache_get):
    """Kiểm thử chuỗi chuyển tiếp mô hình dự phòng khi gặp lỗi phân tán mạng.

    Đảm bảo nếu mô hình chính cấu hình gặp lỗi Rate-limit (429) hoặc sập kết nối,
    hệ thống có khả năng tự động điều phối yêu cầu sang mô hình backup tiếp theo
    trong danh sách để đảm bảo tính liên tục của luồng nghiệp vụ.

    Args:
        mock_post: Đối tượng giả lập phương thức POST bất đồng bộ của lớp httpx.
        mock_cache_get: Đối tượng giả lập lệnh đọc dữ liệu từ kho lưu trữ cache.
    """
    categories = ["Thời trang"]
    mock_cache_get.return_value = None

    gemini_success_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"category": "Thời trang", "search_query": "váy lụa"}'
                        }
                    ]
                }
            }
        ]
    }

    # Giả lập kịch bản: Lần 1 sập (429) -> Lần 2 khôi phục thành công (200)
    mock_post.side_effect = [
        Response(429, text="Rate limit exceeded"),
        Response(200, json=gemini_success_payload),
    ]

    result = await parse_intent("váy lụa cao cấp", categories)

    assert result["search_query"] == "váy lụa"
    assert result["is_fallback"] is False
    # Xác thực vòng lặp thử lại đã kích hoạt lệnh gọi mạng tổng cộng 2 lần
    assert mock_post.call_count == 2


@pytest.mark.anyio
@patch("app.services.ai_service.cache.get", new_callable=AsyncMock)
@patch("httpx.AsyncClient.post", new_callable=AsyncMock)
async def test_parse_intent_complete_failure_fallback_to_regex(
    mock_post, mock_cache_get
):
    """Kiểm thử khả năng phòng thủ tự động hạ cấp về thuật toán xử lý cục bộ.

    Xác thực khi toàn bộ hạ tầng mạng hoặc API Gateway bên ngoài bị cô lập hoàn toàn,
    hệ thống vẫn duy trì khả năng hoạt động bằng cách kích hoạt thuật toán Regex
    nội bộ và đánh dấu trạng thái cảnh báo `is_fallback=True`.

    Args:
        mock_post: Đối tượng giả lập phương thức POST bất đồng bộ của lớp httpx.
        mock_cache_get: Đối tượng giả lập lệnh đọc dữ liệu từ kho lưu trữ cache.
    """
    categories = ["Sách"]
    mock_cache_get.return_value = None

    # Ép luồng gọi mạng thảy ra ngoại lệ nghiêm trọng (mất mạng kết nối)
    mock_post.side_effect = Exception("Network unreachable or DNS resolution failure")

    result = await parse_intent("sách giáo khoa dưới 100k rẻ nhất", categories)

    # Hệ thống bắt buộc phải tự bảo vệ bằng cách chuyển đổi sang luồng xử lý dự phòng
    assert result["is_fallback"] is True
    assert result["category"] == "Sách"
    assert result["max_price"] == 100_000
    assert result["sort"] == "price_asc"


# ==============================================================================
# 3. CACHING LAYER TESTS (REDIS INTEGRATION)
# ==============================================================================


@pytest.mark.anyio
@patch("app.services.ai_service.cache.get", new_callable=AsyncMock)
async def test_parse_intent_returns_cached_data(mock_cache_get):
    """Đảm bảo hệ thống ưu tiên đọc và trả ra dữ liệu từ cache Redis.

    Nếu chuỗi văn bản tìm kiếm trùng lặp đã được phân tích trước đó, hệ thống
    phải trả về ngay lập tức để tối ưu hóa tài nguyên mạng và triệt tiêu độ trễ.

    Args:
        mock_cache_get: Đối tượng giả lập lệnh đọc dữ liệu từ kho lưu trữ cache.
    """
    categories = ["Điện thoại"]
    cached_data = {
        "category": "Điện thoại",
        "min_price": None,
        "max_price": 15000000,
        "sort": "newest",
        "search_query": "samsung galaxy",
        "is_fallback": False,
    }
    mock_cache_get.return_value = cached_data

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        result = await parse_intent("samsung galaxy dưới 15tr mới nhất", categories)

    # Kết quả đầu ra khớp hoàn toàn với dữ liệu đã lưu trong bộ đệm Redis
    assert result == cached_data
    # Đảm bảo tuyệt đối không phát sinh thêm bất kỳ lệnh gọi mạng nào lên LLM API
    mock_post.assert_not_called()
