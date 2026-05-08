import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface OrderSummary {
  id: number;
  status: string;
  payment_status: string;
  total_price: number;
  shipping_status: string;
  created_at: string | null;
}

interface OrdersResponse {
  items: OrderSummary[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [shippingFilter, setShippingFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesKeyword = !normalizedKeyword || String(order.id).includes(normalizedKeyword);
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesPayment = !paymentFilter || order.payment_status === paymentFilter;
      const matchesShipping = !shippingFilter || order.shipping_status === shippingFilter;
      return matchesKeyword && matchesStatus && matchesPayment && matchesShipping;
    });
  }, [keyword, orders, paymentFilter, shippingFilter, statusFilter]);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<OrdersResponse>('/orders/my') as unknown as OrdersResponse;
        setOrders(data.items || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải danh sách đơn hàng'));
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>
          Đang tải đơn hàng...
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Đơn hàng của tôi</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Theo dõi trạng thái giao hàng và thanh toán của từng đơn.</p>
      </header>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--error)',
          color: 'var(--error)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {orders.length > 0 && (
        <div className="glass-card" style={{ padding: '18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label className="input-label">Tìm kiếm</label>
            <input className="input-field" placeholder="Mã đơn hàng" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
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
      )}

      {orders.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Package size={40} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Bạn chưa có đơn hàng nào</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Hãy thêm sản phẩm vào giỏ hàng và tạo đơn đầu tiên của bạn.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Package size={40} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Không có đơn phù hợp</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredOrders.length}/{orders.length} đơn hàng</div>
          {filteredOrders.map((order) => (
            <div key={order.id} className="glass-card" style={{ padding: '24px', display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '20px', marginBottom: '6px' }}>Đơn hàng #{order.id}</h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Tạo lúc: {order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : 'N/A'}
                  </div>
                </div>
                <Link to={`/orders/${order.id}`} className="btn-primary" style={{ justifyContent: 'center' }}>
                  Xem chi tiết
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Trạng thái đơn</div>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{order.status}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Thanh toán</div>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{order.payment_status}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Giao hàng</div>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{order.shipping_status}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Tổng tiền</div>
                  <div style={{ fontWeight: 700 }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_price)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
