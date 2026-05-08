import React, { useEffect, useState } from 'react';
import { Flag, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface ProductOption {
  id: number;
  name: string;
  shop_name?: string;
}

interface ProductsResponse {
  items?: ProductOption[];
}

export const BuyerReports: React.FC = () => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [targetType, setTargetType] = useState('product');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
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
      await apiClient.post('/reports', {
        target_type: targetType,
        target_id: Number(targetId),
        reason,
      });
      setSuccess('Đã gửi báo cáo thành công');
      setTargetId('');
      setReason('');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể gửi báo cáo'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Báo cáo nội dung</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Gửi báo cáo tới admin khi bạn phát hiện nội dung hoặc đối tượng có vấn đề.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}
      <form className="glass-card" style={{ padding: '24px', maxWidth: '720px' }} onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Loại đối tượng</label>
          <select className="input-field" value={targetType} onChange={(e) => { setTargetType(e.target.value); setTargetId(''); }}>
            <option value="product">product</option>
            <option value="shop">shop</option>
            <option value="review">review</option>
            <option value="user">user</option>
          </select>
        </div>
        {targetType === 'product' ? (
          <div className="input-group">
            <label className="input-label">Sản phẩm</label>
            <select className="input-field" value={targetId} onChange={(e) => setTargetId(e.target.value)} required disabled={productsLoading}>
              <option value="">{productsLoading ? 'Đang tải sản phẩm...' : 'Chọn sản phẩm cần báo cáo'}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}{product.shop_name ? ` • ${product.shop_name}` : ''}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="input-group"><label className="input-label">Target ID</label><input type="number" min="1" className="input-field" value={targetId} onChange={(e) => setTargetId(e.target.value)} required /></div>
        )}
        <div className="input-group"><label className="input-label">Lý do báo cáo</label><textarea className="input-field" style={{ minHeight: '140px', resize: 'vertical' }} value={reason} onChange={(e) => setReason(e.target.value)} required /></div>
        <button type="submit" className="btn-primary" disabled={submitting || (targetType === 'product' && productsLoading)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flag size={18} />{submitting ? 'Đang gửi...' : 'Gửi báo cáo'}</button>
      </form>
    </div>
  );
};
