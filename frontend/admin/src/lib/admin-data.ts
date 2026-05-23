export const formatVnd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export const systemKpis = [
  { label: "API throughput", value: "1,842 req/min", trend: "+18%", href: "/metrics", status: "normal" },
  { label: "Error rate", value: "0.42%", trend: "-0.08%", href: "/logs", status: "warning" },
  { label: "P95 latency", value: "286 ms", trend: "+24 ms", href: "/metrics", status: "warning" },
  { label: "Notification jobs", value: "98.7%", trend: "stable", href: "/logs", status: "normal" },
];

export const trafficSeries = [
  { time: "00:00", requests: 840, errors: 4, latency: 210 },
  { time: "04:00", requests: 620, errors: 3, latency: 198 },
  { time: "08:00", requests: 1280, errors: 9, latency: 244 },
  { time: "12:00", requests: 1842, errors: 12, latency: 286 },
  { time: "16:00", requests: 1630, errors: 8, latency: 261 },
  { time: "20:00", requests: 1410, errors: 6, latency: 238 },
];

export const serviceHealth = [
  { name: "API Gateway", uptime: "99,98%", latency: "86 ms", errors: "0,12%", status: "Healthy" },
  { name: "PostgreSQL", uptime: "99,95%", latency: "42 ms", errors: "0,04%", status: "Healthy" },
  { name: "Email worker", uptime: "98,70%", latency: "1,8 s", errors: "1,30%", status: "Degraded" },
  { name: "Payment simulator", uptime: "99,60%", latency: "312 ms", errors: "0,45%", status: "Healthy" },
  { name: "Chat service", uptime: "99,20%", latency: "144 ms", errors: "0,82%", status: "Watch" },
];

export const adminQueues = [
  { label: "Người dùng cần rà soát", count: 17, href: "/users", detail: "Tài khoản bị khóa, đổi vai trò, hoạt động bất thường" },
  { label: "Yêu cầu mở cửa hàng", count: 12, href: "/seller-requests", detail: "Hồ sơ seller đang chờ duyệt" },
  { label: "Báo cáo vi phạm", count: 8, href: "/reports", detail: "Sản phẩm, shop hoặc người bán bị báo cáo" },
  { label: "Log cần kiểm tra", count: 5, href: "/logs", detail: "Lỗi email, thanh toán, latency tăng" },
];

export const usersAdmin = [
  { id: 1, email: "buyer@example.com", name: "Nguyễn Văn A", role: "buyer", status: "active", orders: 8, reports: 0, lastSeen: "2 phút trước" },
  { id: 2, email: "seller@example.com", name: "NovaTech Owner", role: "seller", status: "active", orders: 42, reports: 2, lastSeen: "18 phút trước" },
  { id: 3, email: "admin@example.com", name: "System Admin", role: "admin", status: "active", orders: 0, reports: 0, lastSeen: "online" },
  { id: 4, email: "fraud@example.com", name: "Suspicious Buyer", role: "buyer", status: "banned", orders: 2, reports: 4, lastSeen: "3 ngày trước" },
];

export const sellerRequestsAdmin = [
  { id: 18, owner: "seller@example.com", shop: "NovaTech Store", category: "Laptop & phụ kiện", contact: "0987654321", status: "pending", score: 86, created: "11/05/2026" },
  { id: 19, owner: "urban@example.com", shop: "Urban Steps", category: "Thời trang", contact: "0909123456", status: "pending", score: 72, created: "10/05/2026" },
  { id: 17, owner: "aeris@example.com", shop: "Aeris Home", category: "Nhà thông minh", contact: "support@aeris.vn", status: "reviewing", score: 91, created: "09/05/2026" },
];

export const reportsAdmin = [
  { id: 42, type: "Sản phẩm", target: "LumaBook Air 14", reporter: "buyer@example.com", reason: "Mô tả sai sự thật về bảo hành", status: "pending", severity: "high", age: "2 giờ" },
  { id: 43, type: "Người bán", target: "Urban Steps", reporter: "customer@example.com", reason: "Spam tin nhắn sau khi hỏi hàng", status: "reviewing", severity: "medium", age: "6 giờ" },
  { id: 44, type: "Sản phẩm", target: "PocketCam Secure", reporter: "buyer2@example.com", reason: "Hình ảnh không đúng sản phẩm", status: "pending", severity: "low", age: "1 ngày" },
];

export const auditTrailAdmin = [
  { admin: "admin@example.com", action: "Duyệt seller", target: "seller_request#18", description: "Phê duyệt NovaTech Store", time: "2026-05-11 10:01", result: "success" },
  { admin: "admin@example.com", action: "Khóa user", target: "user#4", description: "Khóa tài khoản vi phạm chính sách", time: "2026-05-11 10:04", result: "success" },
  { admin: "moderator@example.com", action: "Xử lý báo cáo", target: "report#42", description: "Đánh dấu báo cáo đã xử lý", time: "2026-05-11 10:18", result: "success" },
  { admin: "admin@example.com", action: "Đổi vai trò", target: "user#2", description: "Cập nhật quyền seller", time: "2026-05-11 10:24", result: "success" },
];

export const systemLogsAdmin = [
  { level: "INFO", message: "Order notification delivered", source: "email_service", time: "10:11:02", trace: "mail-7821" },
  { level: "WARN", message: "Seller request queue above threshold", source: "admin_service", time: "10:18:44", trace: "queue-1120" },
  { level: "ERROR", message: "Email worker retry exhausted", source: "email_service", time: "10:19:30", trace: "mail-7822" },
  { level: "INFO", message: "Payment transaction recorded", source: "payment_service", time: "10:22:15", trace: "pay-5519" },
  { level: "WARN", message: "Chat latency p95 exceeded baseline", source: "chat_service", time: "10:28:01", trace: "chat-9031" },
];
