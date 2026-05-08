import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Star } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface ProductOption {
  id: number;
  name: string;
  price: number;
  shop_name?: string;
}

interface ProductsResponse {
  items?: ProductOption[];
}

export const BuyerReviews: React.FC = () => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const data = await apiClient.get<ProductsResponse>('/products') as unknown as ProductsResponse;
        setProducts(data.items || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải danh sách sản phẩm'));
      } finally {
        setProductsLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/reviews', {
        product_id: Number(productId),
        rating: Number(rating),
        comment,
      });
      setSuccess('Đã gửi đánh giá thành công');
      setProductId('');
      setRating('5');
      setComment('');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể gửi đánh giá'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Đánh giá sản phẩm</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Chọn sản phẩm và gửi review cho sản phẩm bạn đã mua trong đơn hàng delivered.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}
      <form className="glass-card" style={{ padding: '24px', maxWidth: '720px' }} onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Sản phẩm</label>
          <select className="input-field" value={productId} onChange={(e) => setProductId(e.target.value)} required disabled={productsLoading}>
            <option value="">{productsLoading ? 'Đang tải sản phẩm...' : 'Chọn sản phẩm'}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}{product.shop_name ? ` • ${product.shop_name}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="input-group"><label className="input-label">Số sao</label><select className="input-field" value={rating} onChange={(e) => setRating(e.target.value)}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} sao</option>)}</select></div>
        <div className="input-group"><label className="input-label">Nhận xét</label><textarea className="input-field" style={{ minHeight: '140px', resize: 'vertical' }} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
        <button type="submit" className="btn-primary" disabled={submitting || productsLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Star size={18} />{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
      </form>
    </div>
  );
};
