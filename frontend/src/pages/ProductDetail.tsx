import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Flag, MessageCircle, ShoppingCart, Star } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import { getErrorMessage } from '../utils/errors';

interface ProductDetailResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: { id: number; name: string } | null;
  attributes: Record<string, unknown> | null;
  images: Array<{ id: number; url: string; is_primary: boolean }>;
  shop: { id: number; name: string } | null;
  avg_rating: number | null;
  review_count: number;
}

interface ReviewItem {
  id: number;
  user_id: number;
  rating: number;
  comment: string;
}

interface ReviewsResponse {
  items: ReviewItem[];
}

interface ConversationResponse {
  id: number;
}

export const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const loadProduct = useCallback(async () => {
    if (!id) {
      setError('Không tìm thấy sản phẩm');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [productData, reviewData] = await Promise.all([
        apiClient.get<ProductDetailResponse>(`/products/${id}`) as unknown as Promise<ProductDetailResponse>,
        apiClient.get<ReviewsResponse>(`/products/${id}/reviews`) as unknown as Promise<ReviewsResponse>,
      ]);
      setProduct(productData);
      setSelectedImageId((current) => current ?? productData.images.find((image) => image.is_primary)?.id ?? productData.images[0]?.id ?? null);
      setReviews(reviewData.items || []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải chi tiết sản phẩm'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProduct();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProduct]);

  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (!product || !requireAuth()) return;
    setPending(true);
    setError('');
    setSuccess('');
    try {
      await addToCart(product.id, quantity);
      setSuccess('Đã thêm sản phẩm vào giỏ hàng');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể thêm sản phẩm vào giỏ hàng'));
    } finally {
      setPending(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !requireAuth()) return;
    setPending(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/reviews', { product_id: product.id, rating: Number(rating), comment });
      setComment('');
      setRating('5');
      setSuccess('Đã gửi đánh giá sản phẩm');
      await loadProduct();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể gửi đánh giá'));
    } finally {
      setPending(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !requireAuth()) return;
    setPending(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/reports', { target_type: 'product', target_id: product.id, reason: reportReason });
      setReportReason('');
      setSuccess('Đã gửi báo cáo sản phẩm');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể gửi báo cáo'));
    } finally {
      setPending(false);
    }
  };

  const handleChat = async () => {
    if (!product?.shop || !requireAuth()) return;
    setPending(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiClient.post<ConversationResponse>('/chat/conversations', { seller_id: product.shop.id }) as unknown as ConversationResponse;
      navigate(`/chat/${data.id}`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể mở hội thoại với người bán'));
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>Đang tải chi tiết sản phẩm...</div></div>;
  }

  if (!product) {
    return <div className="container" style={{ paddingBottom: '100px' }}><div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}><h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Không tìm thấy sản phẩm</h1><Link to="/" className="btn-primary" style={{ display: 'inline-flex' }}>Quay lại trang chủ</Link></div></div>;
  }

  const selectedImage = product.images.find((image) => image.id === selectedImageId) || product.images.find((image) => image.is_primary) || product.images[0];

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(0, 1.1fr)', gap: '28px', alignItems: 'start' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-secondary)', marginBottom: '14px' }}>
            {selectedImage ? <img src={selectedImage.url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>No image</div>}
          </div>
          {product.images.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '10px' }}>
              {product.images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: image.id === selectedImage?.id ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    opacity: image.id === selectedImage?.id ? 1 : 0.72,
                  }}
                  aria-label={`Chọn ảnh sản phẩm ${image.id}`}
                >
                  <img src={image.url} alt="Product thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="glass-card" style={{ padding: '28px' }}>
          <div style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', marginBottom: '8px' }}>{product.shop?.name || 'Cửa hàng đối tác'}</div>
          <h1 style={{ fontSize: '34px', marginBottom: '12px' }}>{product.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', color: 'var(--text-secondary)' }}><Star size={16} fill="#fbbf24" color="#fbbf24" />{product.avg_rating || 'Chưa có'} • {product.review_count} đánh giá</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{product.description || 'Sản phẩm chưa có mô tả.'}</p>
          <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '20px' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Tồn kho: {product.stock}</div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
            <input type="number" min="1" max={product.stock} className="input-field" style={{ width: '120px' }} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <button className="btn-primary" onClick={() => void handleAddToCart()} disabled={pending || product.stock <= 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={18} />Thêm vào giỏ</button>
            {product.shop && <button className="btn-secondary" onClick={() => void handleChat()} disabled={pending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle size={18} />Chat với shop</button>}
          </div>

          {product.category && <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Danh mục: {product.category.name}</div>}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.8fr)', gap: '24px', alignItems: 'start', marginTop: '24px' }}>
        <section className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Đánh giá sản phẩm</h2>
          {reviews.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa có đánh giá nào.</p> : <div style={{ display: 'grid', gap: '12px' }}>{reviews.map((review) => <div key={review.id} className="glass-card" style={{ padding: '16px' }}><div style={{ color: '#fbbf24', marginBottom: '6px' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div><p>{review.comment || 'Không có nhận xét.'}</p><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '6px' }}>User #{review.user_id}</div></div>)}</div>}
        </section>

        <aside style={{ display: 'grid', gap: '20px' }}>
          <form className="glass-card" style={{ padding: '24px' }} onSubmit={handleReview}>
            <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Viết đánh giá</h2>
            <div className="input-group"><label className="input-label">Số sao</label><select className="input-field" value={rating} onChange={(e) => setRating(e.target.value)}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} sao</option>)}</select></div>
            <div className="input-group"><label className="input-label">Nhận xét</label><textarea className="input-field" style={{ minHeight: '110px', resize: 'vertical' }} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
            <button className="btn-primary" disabled={pending} type="submit">Gửi đánh giá</button>
          </form>

          <form className="glass-card" style={{ padding: '24px' }} onSubmit={handleReport}>
            <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Báo cáo sản phẩm</h2>
            <div className="input-group"><label className="input-label">Lý do</label><textarea className="input-field" style={{ minHeight: '100px', resize: 'vertical' }} value={reportReason} onChange={(e) => setReportReason(e.target.value)} required /></div>
            <button className="btn-secondary" style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={pending} type="submit"><Flag size={18} />Gửi báo cáo</button>
          </form>
        </aside>
      </div>
    </div>
  );
};
