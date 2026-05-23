export type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  shop: string;
  rating: number;
  reviews: number;
  stock: number;
  image: string;
  description: string;
  tags: string[];
};

export const products: Product[] = [
  {
    id: 1,
    name: "LumaBook Air 14",
    price: 18990000,
    category: "Laptop",
    shop: "NovaTech Store",
    rating: 4.8,
    reviews: 128,
    stock: 18,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=80",
    description: "Laptop mỏng nhẹ cho học tập, lập trình và làm việc sáng tạo với pin bền và màn hình sắc nét.",
    tags: ["học tập", "lập trình", "mỏng nhẹ"],
  },
  {
    id: 2,
    name: "Sony WH Cloud",
    price: 4290000,
    category: "Âm thanh",
    shop: "Soundora",
    rating: 4.7,
    reviews: 92,
    stock: 32,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80",
    description: "Tai nghe chống ồn chủ động, phù hợp làm việc tập trung, học online và di chuyển hằng ngày.",
    tags: ["chống ồn", "học online", "pin lâu"],
  },
  {
    id: 3,
    name: "Stride Runner Pro",
    price: 1590000,
    category: "Thời trang",
    shop: "Urban Steps",
    rating: 4.6,
    reviews: 76,
    stock: 45,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80",
    description: "Giày chạy bộ êm, nhẹ, thoáng khí cho sinh viên và người mới bắt đầu luyện tập.",
    tags: ["giá tốt", "chạy bộ", "sinh viên"],
  },
  {
    id: 4,
    name: "PureMist Mini",
    price: 890000,
    category: "Nhà thông minh",
    shop: "Aeris Home",
    rating: 4.5,
    reviews: 54,
    stock: 60,
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=900&q=80",
    description: "Máy tạo ẩm nhỏ gọn cho phòng ngủ, giữ không khí dịu nhẹ và dễ chịu.",
    tags: ["phòng ngủ", "nhỏ gọn", "không khí"],
  },
  {
    id: 5,
    name: "Focus Lamp One",
    price: 1290000,
    category: "Nhà thông minh",
    shop: "Lumos Studio",
    rating: 4.9,
    reviews: 143,
    stock: 24,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=80",
    description: "Đèn bàn làm việc ánh sáng dịu, hỗ trợ nhiều chế độ cho học tập và đọc sách ban đêm.",
    tags: ["đèn học", "làm việc", "ánh sáng dịu"],
  },
  {
    id: 6,
    name: "PocketCam Secure",
    price: 2190000,
    category: "Camera",
    shop: "HomeGuard",
    rating: 4.4,
    reviews: 61,
    stock: 27,
    image: "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=900&q=80",
    description: "Camera an ninh nhỏ gọn, xem từ xa, phù hợp căn hộ và cửa hàng nhỏ.",
    tags: ["an ninh", "căn hộ", "xem từ xa"],
  },
];

export const categories = ["Tất cả", "Laptop", "Âm thanh", "Thời trang", "Nhà thông minh", "Camera"];

export const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value).replace("₫", "đ");

export const orders = [
  { id: 1001, status: "processing", payment: "success", shipping: "preparing", total: 23280000, date: "11/05/2026" },
  { id: 1000, status: "delivered", payment: "success", shipping: "delivered", total: 1590000, date: "08/05/2026" },
  { id: 999, status: "pending", payment: "pending", shipping: "preparing", total: 2190000, date: "06/05/2026" },
];

export const conversations = [
  { id: 1, name: "NovaTech Store", last: "Máy còn sẵn cấu hình RAM 16GB không?", unread: 2 },
  { id: 2, name: "Soundora", last: "Bot đã gửi gợi ý bảo hành cho khách.", unread: 0 },
  { id: 3, name: "Aeris Home", last: "Đơn hàng đang được chuẩn bị.", unread: 1 },
];
