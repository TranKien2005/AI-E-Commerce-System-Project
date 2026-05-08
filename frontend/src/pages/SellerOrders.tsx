import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import { AlertCircle } from 'lucide-react';

interface SellerOrder {
  id: number;
  user_id: number;
  buyer_name: string | null;
  buyer_email: string | null;
  status: string;
  payment_status: string;
  total_price: number;
  shipping_address: string;
  shipping_status: string;
  shipping_note: string;
  items: Array<{ id: number; product_id: number; quantity: number; price: number }>;
  created_at: string | null;
}

interface SellerOrdersResponse {
  items: SellerOrder[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

export const SellerOrders: React.FC = () => {
  const [items, setItems] = useState<SellerOrder[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [shippingFilter, setShippingFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKeyword = !normalizedKeyword || String(item.id).includes(normalizedKeyword) || (item.buyer_name || '').toLowerCase().includes(normalizedKeyword) || (item.buyer_email || '').toLowerCase().includes(normalizedKeyword);
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesPayment = !paymentFilter || item.payment_status === paymentFilter;
      const matchesShipping = !shippingFilter || item.shipping_status === shippingFilter;
      return matchesKeyword && matchesStatus && matchesPayment && matchesShipping;
    });
  }, [items, keyword, paymentFilter, shippingFilter, statusFilter]);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<SellerOrdersResponse>('/seller/orders') as unknown as SellerOrdersResponse;
        setItems(data.items || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải đơn hàng của shop'));
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Đơn hàng của shop</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Theo dõi, lọc và xử lý đơn hàng của khách mua sản phẩm từ shop của bạn.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}

      <div className="glass-card" style={{ padding: '18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', alignItems: 'end' }}>
        <div>
          <label className="input-label">Tìm kiếm</label>
          <input className="input-field" placeholder="Mã đơn, tên hoặc email" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Trạng thái đơn</label>
          <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="shipping">shipping</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <div>
          <label className="input-label">Thanh toán</label>
          <select className="input-field" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="pending">pending</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <div>
          <label className="input-label">Giao hàng</label>
          <select className="input-field" value={shippingFilter} onChange={(e) => setShippingFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="preparing">preparing</option>
            <option value="shipping">shipping</option>
            <option value="delivered">delivered</option>
            <option value="returned">returned</option>
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải đơn hàng...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Chưa có đơn hàng nào.</p>
        ) : filteredItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Không có đơn hàng phù hợp bộ lọc.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredItems.length}/{items.length} đơn hàng</div>
            {filteredItems.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'start', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', marginBottom: '6px' }}>Đơn hàng #{item.id}</h2>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Khách hàng: {item.buyer_name || 'N/A'} • {item.buyer_email || 'N/A'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tạo lúc: {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'N/A'}</div>
                  </div>
                  <Link to={`/seller/orders/${item.id}`} className="btn-primary">Quản lý đơn</Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div><div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Trạng thái đơn</div><div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{item.status}</div></div>
                  <div><div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Thanh toán</div><div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{item.payment_status}</div></div>
                  <div><div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Giao hàng</div><div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{item.shipping_status}</div></div>
                  <div><div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Tổng tiền</div><div style={{ fontWeight: 700 }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_price)}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
