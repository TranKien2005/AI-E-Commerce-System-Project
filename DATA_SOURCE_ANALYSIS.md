# Phân tích nguồn dữ liệu có thể khai thác

Tài liệu này tách riêng khỏi README để phục vụ việc chọn nguồn dữ liệu và quyết định phần nào nên đưa vào database. Nội dung tập trung vào dữ liệu có thể khai thác từ Google Product Taxonomy và Amazon Reviews 2023, bao gồm phần seed đang dùng, phần còn bỏ ngỏ, tiềm năng ứng dụng và tác động đến schema/backend/frontend.

## Mục tiêu đánh giá

Dự án cần dữ liệu đủ tốt cho một hệ thống e-commerce thật hơn demo UI:

- Catalog có category, sản phẩm, ảnh, thông số, shop.
- Buyer có hành vi, review, order history.
- Seller/admin có dữ liệu thống kê có ý nghĩa.
- AI/recommendation có dữ liệu tương tác hoặc quan hệ sản phẩm.
- Storefront có thể hiển thị review, thông số, bundle, gợi ý cá nhân hóa.

## Nguồn dữ liệu đang được xem xét

| Nguồn | Vai trò | Trạng thái hiện tại |
|---|---|---|
| Google Product Taxonomy | Chuẩn hóa cây danh mục sản phẩm | Đang dùng để seed `categories` |
| Amazon Reviews 2023 raw metadata | Metadata sản phẩm, ảnh, store, rating tổng hợp | Đang dùng một phần để seed `products`, `product_images`, `shops` |
| Amazon Reviews 2023 raw reviews | Review thật, user_id, rating, timestamp, verified purchase | Chưa khai thác |
| Amazon Reviews 2023 rating-only | Ma trận user-product-rating nhẹ | Chưa khai thác |
| Amazon Reviews 2023 benchmark/history | Split train/valid/test, lịch sử user cho recommender | Chưa khai thác |

## 1. Google Product Taxonomy

### Dữ liệu cung cấp

Google Product Taxonomy cung cấp cây danh mục chuẩn dạng path nhiều cấp, ví dụ:

```text
Electronics > Computers > Laptops
Health & Beauty > Personal Care
Apparel & Accessories > Shoes
```

### Đang dùng trong seed

Script seed tải taxonomy và tạo bảng `categories` với `name` và `parent_id`. Sau đó metadata sản phẩm từ Amazon được map về một category gần đúng bằng keyword/fuzzy matching.

### Tiềm năng khai thác

#### 1.1 Category navigation

Có thể dùng taxonomy để tạo menu category nhiều cấp trên storefront:

- Category cấp cao: Electronics, Apparel, Home & Garden, Health & Beauty.
- Category con: Mobile Phones, Laptops, Skin Care, Shoes.
- Breadcrumb trên product detail.

Giá trị: storefront trông giống sàn thương mại điện tử thật hơn, không phải danh sách sản phẩm phẳng.

#### 1.2 Filter theo category chuẩn

Khi sản phẩm được map vào taxonomy, catalog có thể filter bằng `category_id` thay vì text category không đồng nhất từ dataset.

Giá trị: URL/query rõ ràng, backend search dễ tối ưu, admin có thể quản lý category.

#### 1.3 Mapping dataset đa nguồn

Nếu sau này import nhiều dataset khác nhau, taxonomy đóng vai trò chuẩn nội bộ. Mỗi nguồn ngoài chỉ cần map về category nội bộ.

Giá trị: tránh database bị lẫn nhiều tên category khác nhau cho cùng một loại sản phẩm.

#### 1.4 AI category classifier

Khi keyword/fuzzy matching không đủ, có thể dùng AI để phân loại sản phẩm vào taxonomy dựa trên title, description, features, details.

Giá trị: category chính xác hơn, đặc biệt khi import nhiều domain.

### Hạn chế

- Taxonomy chỉ là cây category, không có sản phẩm/review/user.
- Một số category quá sâu, UI cần chọn lọc để không rối.
- Cần cơ chế map tốt từ dữ liệu ngoài vào taxonomy.

### Khuyến nghị

Nên giữ taxonomy làm chuẩn category chính. Không cần mở rộng schema ngay, nhưng nên thêm công cụ kiểm tra tỷ lệ sản phẩm bị map vào `Uncategorized`.

## 2. Amazon Reviews 2023 raw metadata

### Dữ liệu cung cấp

Subset metadata có các nhóm field chính:

| Nhóm | Field | Ý nghĩa |
|---|---|---|
| Nhận diện | `parent_asin`, `title`, `main_category`, `categories` | ID sản phẩm, tên, category gốc |
| Nội dung | `features`, `description`, `subtitle`, `author` | Mô tả, bullet points, thông tin phụ |
| Thương mại | `price`, `store`, `average_rating`, `rating_number` | Giá, shop/brand, điểm đánh giá tổng hợp |
| Media | `images`, `videos` | Ảnh sản phẩm, video sản phẩm |
| Thuộc tính | `details` | Thông số chi tiết dạng object |
| Quan hệ | `bought_together` | Sản phẩm thường mua cùng nhau |

### Đang dùng trong seed

Seed hiện đã khai thác các phần cơ bản:

- `title` → `Product.name`
- `features`/`description` → `Product.description`
- `price` → `Product.price`
- `images` → `ProductImage.url`
- `store`/brand → shop/attributes
- `categories`/`main_category` → mapping category
- `average_rating`/`rating_number` → lưu trong `Product.attributes`

Các phần dưới đây là phần còn tiềm năng khai thác thêm.

## 2.1 Metadata `details`

### Bản chất dữ liệu

`details` là object chứa thông số sản phẩm. Với từng domain, nội dung có thể khác nhau.

Ví dụ có thể gặp:

- Brand
- Manufacturer
- Model number
- Color
- Size
- Material
- Dimensions
- Weight
- UPC
- Ingredients
- Skin type
- Hair type
- Scent
- Item form
- Technical specs

### Tiềm năng backend/database

Có ba mức khai thác:

#### Mức 1: lưu raw JSON trong `Product.attributes.details`

Ít rủi ro nhất, không cần migration.

Lợi ích:

- Không mất dữ liệu gốc.
- Dễ inspect sau khi import.
- Có thể dùng cho AI search/prompt context.

Nhược điểm:

- Khó filter bằng SQL nếu key không chuẩn.
- Frontend cần parse linh hoạt.

#### Mức 2: normalize key phổ biến

Tạo helper chuẩn hóa các key hay gặp:

- brand
- manufacturer
- model
- color
- size
- material
- dimensions
- weight

Có thể vẫn lưu trong JSON nhưng key đã được chuẩn hóa.

Lợi ích:

- Product detail có bảng thông số ổn định hơn.
- Search/filter dễ hơn.

#### Mức 3: tạo bảng specs riêng

Ví dụ bảng `product_attributes`:

```text
id
product_id
key
value
source_key
```

Lợi ích:

- Filter/search attribute tốt hơn.
- Admin có thể quản lý thông số.
- Dễ query theo key/value.

Nhược điểm:

- Cần migration.
- Cần chuẩn hóa dữ liệu kỹ hơn.

### Tiềm năng frontend

- Product detail: bảng “Thông số sản phẩm”.
- Catalog filter: filter theo size, color, brand, material.
- So sánh sản phẩm: đặt specs cạnh nhau.
- AI assistant: trả lời câu hỏi dựa vào thông số thật.

### Giá trị ưu tiên

Rất cao. Đây là phần metadata đáng khai thác nhất sau dữ liệu cơ bản.

### Khuyến nghị

Nên bắt đầu bằng mức 1 hoặc mức 2: lưu `details` vào `Product.attributes.details`, đồng thời normalize một số key phổ biến để hiển thị product detail.

## 2.2 Metadata `bought_together`

### Bản chất dữ liệu

`bought_together` biểu diễn sản phẩm thường mua cùng nhau trên Amazon. Field này có thể là list hoặc string JSON tùy loader/row, cần kiểm tra dữ liệu thực tế trước khi dùng mạnh.

### Tiềm năng backend/database

#### Mức 1: lưu raw trong attributes

Lưu vào:

```text
Product.attributes.bought_together
```

Lợi ích: giữ dữ liệu để kiểm tra sau.

#### Mức 2: tạo quan hệ sản phẩm

Tạo bảng ví dụ `product_relations`:

```text
id
product_id
related_source_id
related_product_id nullable
relation_type = bought_together
weight
```

Sau khi import nhiều sản phẩm, nếu `related_source_id` tồn tại trong catalog thì map sang `related_product_id`.

### Tiềm năng tính năng

- Box “Thường mua cùng nhau”.
- Gợi ý thêm vào giỏ hàng.
- Bundle checkout.
- Cross-sell trên product detail/cart.
- Recommendation rule-based không cần model AI.

### Giá trị ưu tiên

Cao nếu muốn e-commerce giống thật nhanh. Với catalog nhỏ 100 sản phẩm, tỷ lệ match có thể thấp; nếu import nhiều domain/sản phẩm hơn thì giá trị tăng.

### Khuyến nghị

Nên lưu raw trước. Sau khi import nhiều sản phẩm hơn, kiểm tra tỷ lệ match giữa `bought_together` và product catalog rồi mới tạo bảng relation.

## 2.3 Metadata `videos`

### Bản chất dữ liệu

`videos` gồm:

- `title`
- `url`
- `user_id`

### Tiềm năng backend/database

#### Mức 1: lưu trong JSON attributes

```text
Product.attributes.videos
```

#### Mức 2: tạo bảng `product_videos`

```text
id
product_id
title
url
source_user_id
```

### Tiềm năng frontend

- Media gallery trong product detail.
- Video review/demo.
- Section “Video từ người dùng”.
- Tăng độ tin cậy và độ thật của sản phẩm.

### Tiềm năng AI

Nếu có transcript hoặc title mô tả tốt, video có thể làm context cho AI product assistant. Tuy nhiên URL video tự thân không giúp nhiều nếu không xử lý nội dung video.

### Giá trị ưu tiên

Trung bình. Có ích cho UI cao cấp nhưng không quan trọng bằng review/order/recommendation.

### Khuyến nghị

Lưu JSON trước, chưa cần migration riêng cho video.

## 2.4 Metadata `subtitle` và `author`

### Bản chất dữ liệu

- `subtitle`: phụ đề sản phẩm, hữu ích trong một số domain.
- `author`: tác giả, đặc biệt hữu ích với Books/Media.

### Tiềm năng sử dụng

- Product detail phụ đề.
- Books/media catalog.
- Filter theo author nếu import Books.
- Search theo author.

### Giá trị ưu tiên

Thấp nếu vẫn tập trung All Beauty. Cao hơn nếu import Books, Kindle Store, Movies/TV, Music.

### Khuyến nghị

Lưu vào `Product.attributes` để không mất dữ liệu, chưa cần schema riêng.

## 2.5 Image `variant`

### Bản chất dữ liệu

Mỗi image có:

- `hi_res`
- `large`
- `thumb`
- `variant`

`variant` có thể cho biết ảnh chính hoặc ảnh phụ.

### Tiềm năng sử dụng

- Ưu tiên ảnh `MAIN` làm ảnh chính.
- Sắp xếp gallery đúng thứ tự hơn.
- Phân biệt ảnh chính, ảnh chi tiết, ảnh variant.
- Hỗ trợ chọn ảnh theo màu/kiểu nếu dữ liệu đủ tốt.

### Tác động schema

Bảng `product_images` hiện chỉ có:

```text
id
product_id
url
is_primary
```

Nếu muốn khai thác tốt hơn, có thể thêm:

```text
variant
source_size
```

### Giá trị ưu tiên

Trung bình. Dễ cải thiện chất lượng gallery nhưng không tạo thêm dữ liệu hành vi.

### Khuyến nghị

Nên ưu tiên chọn primary image theo `variant=MAIN` trong seed trước. Migration lưu `variant` có thể làm sau.

## 3. Amazon Reviews 2023 raw reviews

### Bản chất dữ liệu

Raw reviews là dữ liệu đánh giá thật của user. Đây là phần có giá trị cao nhất nếu muốn app có hành vi người dùng, review thật và recommendation.

Các field quan trọng:

| Field | Ý nghĩa |
|---|---|
| `user_id` | ID reviewer |
| `rating` | Điểm 1-5 |
| `title` | Tiêu đề review |
| `text` | Nội dung review |
| `images` | Ảnh review do user upload |
| `asin` | ID sản phẩm cụ thể |
| `parent_asin` | ID parent product, dùng join với metadata |
| `timestamp` | Thời điểm review |
| `verified_purchase` | Review từ giao dịch đã xác thực |
| `helpful_vote` / `helpful_votes` | Số vote hữu ích |

## 3.1 Review `user_id`

### Tiềm năng

Có thể tạo buyer seed từ `user_id` thay vì chỉ có một buyer mặc định.

Cách dùng:

```text
user_id -> hashed email -> User(role=buyer)
```

Ví dụ:

```text
amazon-user-<hash>@example.com
```

### Tính năng mở ra

- Nhiều buyer thật hơn.
- Lịch sử review/order theo từng user.
- Recommendation cá nhân hóa.
- Admin users có dữ liệu phong phú.
- Seller có repeat customers/statistics.

### Giá trị ưu tiên

Rất cao nếu dùng raw reviews.

## 3.2 Review `rating`, `title`, `text`

### Tiềm năng

Map trực tiếp vào bảng `reviews` hiện tại:

- `rating` → `Review.rating`
- `text` → `Review.comment`

Schema hiện chưa có `title`, nếu muốn giữ title cần:

- Thêm `Review.title`, hoặc
- Ghép title vào comment, hoặc
- Lưu metadata trong JSON nếu thêm field sau.

### Tính năng mở ra

- Product detail có review thật.
- Tính avg rating/review count từ bảng `reviews` thay vì attributes.
- AI summary ưu/nhược điểm sản phẩm.
- Search theo review content.
- Moderation/report review.

### Giá trị ưu tiên

Rất cao. Đây là phần nên khai thác đầu tiên nếu chốt raw reviews.

## 3.3 Review `timestamp`

### Tiềm năng

Dùng để set thời gian tạo review/order theo lịch sử thật.

Tính năng mở ra:

- Review gần đây.
- Trending products theo thời gian.
- Admin chart theo ngày/tháng.
- Seller stats theo giai đoạn.
- Time-aware recommendation.

### Tác động kỹ thuật

Các model có `created_at` từ `TimestampMixin`; cần kiểm tra mixin có cho set thủ công không. Nếu có, seed có thể gán `created_at` theo timestamp dataset.

### Giá trị ưu tiên

Cao, đặc biệt cho dashboard/admin/seller stats.

## 3.4 Review `verified_purchase`

### Tiềm năng

Đây là field quan trọng để biến review thành dữ liệu mua hàng đáng tin.

Cách dùng:

- Nếu `verified_purchase=true`: tạo `Order`, `OrderItem`, `Payment`, sau đó tạo `Review`.
- Nếu `verified_purchase=false`: chỉ tạo `Review`, hoặc bỏ qua tùy độ sạch mong muốn.

### Tính năng mở ra

- Buyer order history.
- Seller revenue/order stats.
- Admin metrics thật hơn.
- Badge “Đã mua hàng” trên review.
- Recommendation dựa trên purchase thay vì chỉ rating.

### Tác động schema

Hiện `Review` chưa có `verified_purchase`. Nếu muốn hiển thị badge, cần thêm field hoặc suy ra bằng việc user có order chứa product đó.

### Giá trị ưu tiên

Rất cao. Nếu muốn tạo order history từ dataset, đây là field nên dùng làm điều kiện chính.

## 3.5 Review `helpful_vote`

### Tiềm năng

Số vote hữu ích cho biết review nào có chất lượng hoặc được cộng đồng tin.

Tính năng mở ra:

- Sort review theo “hữu ích nhất”.
- Highlight review chất lượng.
- Weight rating theo helpful votes.
- AI summary ưu tiên review có helpful vote cao.
- Detect sản phẩm/review có độ tin cậy cao hơn.

### Tác động schema

Cần thêm field vào `reviews`, ví dụ:

```text
helpful_votes integer default 0
```

### Giá trị ưu tiên

Trung bình-cao. Rất hữu ích nếu UI review được đầu tư.

## 3.6 Review images

### Bản chất dữ liệu

Review có ảnh thực tế từ user, thường gồm nhiều kích thước URL:

- small
- medium
- large

### Tính năng mở ra

- Review kèm ảnh.
- Product detail có social proof tốt hơn.
- Buyer thấy ảnh thực tế, không chỉ ảnh catalog.
- AI/vision sau này có thể phân tích ảnh thực tế nếu cần.

### Tác động schema

Cần thêm bảng nếu muốn lưu chuẩn:

```text
review_images
id
review_id
url
size
```

### Giá trị ưu tiên

Trung bình. UI rất tốt nhưng cần thêm schema.

## 3.7 `asin` và `parent_asin`

### Vai trò

- `parent_asin` nên dùng để join review với product metadata.
- `asin` có thể đại diện variant cụ thể.

### Tiềm năng

- Join metadata-review chính xác.
- Nếu sau này có variant sản phẩm, `asin` giúp map variant.
- Kiểm soát review nào thuộc product nào.

### Giá trị ưu tiên

Bắt buộc nếu import raw reviews.

## 4. Rating-only datasets

### Bản chất dữ liệu

Các config `rating_only` thường chứa dữ liệu gọn hơn raw reviews, tập trung vào interaction:

```text
user_id
parent_asin/item_id
rating
timestamp nếu có
```

Có hai nhóm phổ biến:

- `0core_rating_only_*`: ít lọc hơn, nhiều dữ liệu hơn.
- `5core_rating_only_*`: user/item có tối thiểu 5 tương tác, sạch hơn cho recommender.

### Tiềm năng sử dụng

#### Recommendation matrix

Dữ liệu user-product-rating phù hợp cho:

- Collaborative filtering.
- Matrix factorization.
- Item-item similarity.
- User-user similarity.
- Personalized ranking.

#### Lightweight seed

Nếu không cần review text, rating-only nhẹ hơn raw review và dễ import hơn.

#### Buyer behavior

Có thể tạo bảng interaction riêng thay vì ép thành order/review.

Ví dụ bảng tương lai:

```text
user_product_interactions
id
user_id
product_id
interaction_type
rating
source_timestamp
```

### So sánh với raw reviews

| Tiêu chí | Raw reviews | Rating-only |
|---|---|---|
| Có text review | Có | Không |
| Có ảnh review | Có thể có | Không |
| Nhẹ để import | Trung bình/thấp | Cao |
| Phù hợp recommender | Cao | Rất cao |
| Phù hợp product detail | Rất cao | Thấp |

### Giá trị ưu tiên

Cao nếu mục tiêu là AI recommendation. Thấp hơn raw review nếu mục tiêu là UI product detail/review.

## 5. Benchmark/history datasets

### Bản chất dữ liệu

Dataset có các config benchmark như:

- `last_out`
- `last_out_w_his`
- `timestamp`
- `timestamp_w_his`

Các config này thường phục vụ bài toán recommendation với split train/valid/test.

### Tiềm năng sử dụng

#### Next-item prediction

Dự đoán sản phẩm tiếp theo user có thể tương tác/mua dựa trên lịch sử.

#### Time-aware recommendation

Dùng timestamp để học hành vi theo thời gian.

#### Evaluation chuẩn

Có train/valid/test split để đo chất lượng recommender, thay vì chỉ hiển thị rule-based.

#### User history có sẵn

Các config `*_w_his` đáng chú ý vì có thể chứa lịch sử user đã được đóng gói sẵn.

### Tác động kiến trúc

Không nên nhét trực tiếp benchmark data vào bảng commerce nếu chưa thiết kế recommender. Nên cân nhắc module riêng:

```text
recommendation_events
recommendation_datasets
recommendation_candidates
```

hoặc xử lý offline trong script/model riêng.

### Giá trị ưu tiên

Rất cao nếu dự án cần phần AI recommendation nghiêm túc. Nếu mục tiêu trước mắt là e-commerce CRUD/UI, có thể để sau.

## 6. Import nhiều domain ngoài All Beauty

### Hiện trạng

Seed mặc định đang dùng:

```text
raw_meta_All_Beauty
```

Điều này làm catalog nghiêng về beauty/personal care.

### Domain tiềm năng

| Domain | Giá trị cho app |
|---|---|
| Electronics | Sản phẩm công nghệ, dễ demo specs/filter |
| Cell Phones and Accessories | Mobile/accessory, phù hợp e-commerce phổ biến |
| Home and Kitchen | Đồ gia dụng, nhiều category/filter |
| Clothing Shoes and Jewelry | Fashion, cần variant size/color |
| Books | Tận dụng `author`, `subtitle` |
| Sports and Outdoors | Sản phẩm thể thao, category đa dạng |
| Toys and Games | Hình ảnh/catalog phong phú |
| Health and Household | Gần beauty, dễ mở rộng |
| Grocery and Gourmet Food | Có thể demo reorder/basket |
| Video Games | Có rating/review mạnh |
| Automotive | Specs/details phong phú |

### Tiềm năng sử dụng

- Catalog đa ngành giống marketplace hơn.
- Category navigation có ý nghĩa hơn.
- Search có nhiều tình huống test.
- Recommendation cross-category.
- Admin metrics/shop/product phân bố đa dạng hơn.

### Rủi ro

- Category mapping khó hơn.
- Details/specs khác nhau nhiều theo domain.
- Image host/URL có thể không ổn định.
- Import quá nhiều làm seed chậm.

### Khuyến nghị

Nên import nhiều domain với limit nhỏ mỗi domain, ví dụ:

```text
All_Beauty: 100
Electronics: 100
Home_and_Kitchen: 100
Clothing_Shoes_and_Jewelry: 100
Books: 100
```

Sau đó kiểm tra:

- Tỷ lệ có ảnh.
- Tỷ lệ có price.
- Tỷ lệ map category thành công.
- Tỷ lệ có details hữu ích.
- Tỷ lệ review join được bằng parent_asin.

## 7. Mapping dữ liệu vào database hiện tại

### Không cần migration ngay

Có thể lưu các field sau vào `Product.attributes` trước:

- `details`
- `bought_together`
- `videos`
- `subtitle`
- `author`
- image variant metadata nếu chưa đổi bảng

Cách này phù hợp để thử nghiệm nhanh và tránh thay schema khi chưa chốt.

### Nên cân nhắc migration nếu chốt dùng lâu dài

| Nhu cầu | Schema nên thêm |
|---|---|
| Review có title/helpful/verified badge | Thêm field vào `reviews` |
| Review có ảnh | Thêm `review_images` |
| Product có video gallery | Thêm `product_videos` |
| Bought together/cross-sell | Thêm `product_relations` |
| Filter specs mạnh | Thêm `product_attributes` |
| Recommendation event/history | Thêm `user_product_interactions` hoặc module recommender riêng |

## 8. Các hướng khai thác theo mục tiêu sản phẩm

### Hướng A: Ưu tiên storefront thật nhanh

Nên chọn:

1. Metadata `details`
2. Metadata `bought_together`
3. Multiple domains
4. Raw reviews cơ bản: rating/text/user_id

Kết quả:

- Product detail có specs/reviews.
- Catalog đa dạng.
- Có cross-sell đơn giản.

### Hướng B: Ưu tiên seller/admin analytics

Nên chọn:

1. Raw reviews với `timestamp`
2. `verified_purchase` để tạo orders/payments
3. Multiple buyers từ `user_id`
4. Multiple domains/shops

Kết quả:

- Admin metrics có số liệu thật hơn.
- Seller stats có đơn hàng/doanh thu/sản phẩm bán chạy.
- Buyer profile/orders có lịch sử.

### Hướng C: Ưu tiên AI recommendation

Nên chọn:

1. Rating-only 5core
2. Benchmark `timestamp_w_his` hoặc `last_out_w_his`
3. Bought together làm baseline rule-based
4. Raw reviews text cho explanation/summarization

Kết quả:

- Có dữ liệu huấn luyện/evaluate recommender.
- Có personalized recommendation.
- Có thể giải thích gợi ý bằng review/details.

### Hướng D: Ưu tiên AI search/product assistant

Nên chọn:

1. Metadata `details`
2. Features/description đã có
3. Raw review `text`
4. Review helpful votes để chọn review chất lượng

Kết quả:

- Search theo nhu cầu tự nhiên tốt hơn.
- AI trả lời câu hỏi sản phẩm có căn cứ hơn.
- Có summary ưu/nhược điểm.

## 9. Đề xuất thứ tự triển khai an toàn

### Bước 1: Khảo sát dữ liệu mẫu

Viết script inspect không ghi DB:

- In 5-20 row metadata đầy đủ.
- In 5-20 row raw review.
- In schema/key frequency của `details`.
- In tỷ lệ `bought_together` có dữ liệu.
- In tỷ lệ review có `verified_purchase`, `images`, `helpful_vote`.

### Bước 2: Lưu thêm metadata không cần migration

Mở rộng seed để lưu:

- `details`
- `bought_together`
- `videos`
- `subtitle`
- `author`
- image variant nếu có thể

vào `Product.attributes`.

### Bước 3: Import raw reviews nhỏ

Thử với limit nhỏ:

- Join bằng `parent_asin`.
- Tạo buyer từ `user_id`.
- Tạo `Review` từ rating/text.
- Chưa tạo order vội nếu chưa kiểm tra verified purchase.

### Bước 4: Tạo order history từ verified purchase

Sau khi review import ổn:

- Với `verified_purchase=true`, tạo order/order_item/payment.
- Gán thời gian theo `timestamp` nếu model cho phép.
- Tránh tạo trùng bằng source id/hash.

### Bước 5: Chốt schema nâng cấp

Sau khi xem dữ liệu thật trong DB, quyết định có thêm:

- `review_images`
- `product_relations`
- `product_attributes`
- `product_videos`
- `user_product_interactions`

## 10. Bảng ưu tiên tổng hợp

| Phần dữ liệu | Giá trị | Độ khó | Nên làm khi nào |
|---|---:|---:|---|
| `details` | Rất cao | Thấp-Trung bình | Sớm |
| Raw review rating/text/user_id | Rất cao | Trung bình | Sớm |
| `verified_purchase` → orders | Rất cao | Trung bình-Cao | Sau khi review import ổn |
| `timestamp` | Cao | Trung bình | Cùng raw reviews |
| `bought_together` | Cao | Trung bình | Sau khi catalog đủ lớn |
| Multiple domains | Cao | Trung bình | Sớm, limit nhỏ |
| Rating-only | Cao cho recommender | Trung bình | Khi làm recommendation |
| Benchmark history | Rất cao cho AI | Cao | Khi tách module recommender |
| Review images | Trung bình | Trung bình | Khi nâng UI review |
| Product videos | Trung bình | Thấp-Trung bình | Sau |
| `subtitle`/`author` | Tùy domain | Thấp | Khi import Books/media |
| Image `variant` | Trung bình | Thấp | Khi cải thiện gallery |

## Kết luận đề xuất

Nếu cần chọn hướng thực dụng nhất cho giai đoạn tiếp theo, nên ưu tiên:

1. Parse và lưu metadata `details` để product detail/search có chiều sâu.
2. Import raw reviews để tạo buyer/review thật.
3. Dùng `verified_purchase` từ raw reviews để tạo order/payment history.
4. Import thêm vài domain ngoài All Beauty với limit nhỏ.
5. Lưu `bought_together` để chuẩn bị cross-sell/recommendation rule-based.

Các phần rating-only và benchmark history rất đáng giá, nhưng nên để cho bước recommendation riêng để tránh làm phức tạp schema commerce quá sớm.
