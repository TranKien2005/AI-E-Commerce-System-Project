import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import { AlertCircle, CheckCircle, Save } from 'lucide-react';

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

export const SellerOrderDetail: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<SellerOrder | null>(null);
  const [statusValue, setStatusValue] = useState('');
  const [shippingStatus, setShippingStatus] = useState('');
  const [shippingNote, setShippingNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError('Không tìm thấy đơn hàng');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<SellerOrder>(`/seller/orders/${id}`) as unknown as SellerOrder;
      setOrder(data);
      setStatusValue(data.status);
      setShippingStatus(data.shipping_status);
      setShippingNote(data.shipping_note || '');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải chi tiết đơn hàng'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadOrder]);

  const updateStatus = async () => {
    if (!order) return;
    setSavingStatus(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/seller/orders/${order.id}`, { status: statusValue });
      await loadOrder();
      setSuccess('Cập nhật trạng thái đơn hàng thành công');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật trạng thái đơn hàng'));
    } finally {
      setSavingStatus(false);
    }
  };

  const updateShipping = async () => {
    if (!order) return;
    setSavingShipping(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/seller/orders/${order.id}/shipping`, { shipping_status: shippingStatus, shipping_note: shippingNote });
      await loadOrder();
      setSuccess('Cập nhật trạng thái vận chuyển thành công');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật vận chuyển'));
    } finally {
      setSavingShipping(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>Đang tải chi tiết đơn hàng...</div></div>;
  }

  if (!order) {
    return <div className="container" style={{ paddingBottom: '100px' }}><div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}><h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Không tìm thấy đơn hàng</h1><Link to="/seller/orders" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>Quay lại danh sách đơn</Link></div></div>;
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Quản lý đơn hàng #{order.id}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Khách hàng: {order.buyer_name || 'N/A'} • {order.buyer_email || 'N/A'}</p>
        </div>
        <Link to="/seller/orders" className="btn-secondary">Quay lại danh sách đơn</Link>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: '24px', alignItems: 'start' }}>
        <section className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Sản phẩm trong đơn</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {order.items.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Sản phẩm #{item.product_id}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Số lượng: {item.quantity}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
        </section>

        <aside style={{ display: 'grid', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Cập nhật trạng thái đơn</h2>
            <div className="input-group"><label className="input-label">Trạng thái</label><select className="input-field" value={statusValue} onChange={(e) => setStatusValue(e.target.value)}><option value="pending">pending</option><option value="processing">processing</option><option value="shipping">shipping</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option></select></div>
            <button className="btn-primary" onClick={() => void updateStatus()} disabled={savingStatus} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={18} />{savingStatus ? 'Đang lưu...' : 'Lưu trạng thái đơn'}</button>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Cập nhật vận chuyển</h2>
            <div className="input-group"><label className="input-label">Trạng thái vận chuyển</label><input className="input-field" value={shippingStatus} onChange={(e) => setShippingStatus(e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Ghi chú vận chuyển</label><textarea className="input-field" style={{ minHeight: '100px', resize: 'vertical' }} value={shippingNote} onChange={(e) => setShippingNote(e.target.value)} /></div>
            <button className="btn-primary" onClick={() => void updateShipping()} disabled={savingShipping} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={18} />{savingShipping ? 'Đang lưu...' : 'Lưu vận chuyển'}</button>
          </div>
        </aside>
      </div>
    </div>
  );
};
