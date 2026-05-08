import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, CreditCard, Package, RotateCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import { createIdempotencyKey } from '../utils/idempotency';

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
}

interface OrderDetailResponse {
  id: number;
  status: string;
  payment_status: string;
  total_price: number;
  shipping_address: string;
  shipping_status: string;
  shipping_note: string;
  items: OrderItem[];
  created_at: string | null;
}

interface PaymentResponse {
  order_id: number;
  method: string;
  status: string;
  transaction_id: string;
  created_at: string | null;
}

interface PaymentActionResponse {
  payment_id: number;
  status: string;
}

export const OrderDetail: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPayment = useCallback(async (orderId: number) => {
    try {
      const data = await apiClient.get<PaymentResponse>(`/payments/${orderId}`) as unknown as PaymentResponse;
      setPayment(data);
    } catch {
      setPayment(null);
    }
  }, []);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError('Không tìm thấy mã đơn hàng');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<OrderDetailResponse>(`/orders/${id}`) as unknown as OrderDetailResponse;
      setOrder(data);
      if (data.payment_status !== 'pending') {
        await loadPayment(data.id);
      } else {
        setPayment(null);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải chi tiết đơn hàng'));
    } finally {
      setLoading(false);
    }
  }, [id, loadPayment]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrder();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOrder]);

  const handlePay = async () => {
    if (!order) {
      return;
    }

    setError('');
    setSuccess('');
    setPaying(true);
    try {
      const data = await apiClient.post<PaymentActionResponse>(`/payments/${order.id}/pay`, undefined, {
        headers: {
          'X-Idempotency-Key': createIdempotencyKey(`order-${order.id}`),
        },
      }) as unknown as PaymentActionResponse;
      await loadOrder();
      await loadPayment(order.id);
      setSuccess(data.status === 'success' ? 'Thanh toán thành công' : 'Thanh toán thất bại, bạn có thể thử lại');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể xử lý thanh toán'));
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!order) {
      return;
    }

    setError('');
    setSuccess('');
    setCancelling(true);
    try {
      await apiClient.post(`/orders/${order.id}/cancel`);
      await loadOrder();
      setSuccess('Đơn hàng đã được hủy thành công');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể hủy đơn hàng'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>
          Đang tải chi tiết đơn hàng...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ paddingBottom: '100px' }}>
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Không tìm thấy đơn hàng</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Đơn hàng này không tồn tại hoặc bạn không có quyền truy cập.</p>
          <Link to="/orders" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
            Quay lại danh sách đơn
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = order.status === 'pending' || order.status === 'processing';
  const canPay = order.payment_status !== 'success';

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Chi tiết đơn hàng #{order.id}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Tạo lúc: {order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : 'N/A'}
            </p>
          </div>
          <Link to="/orders" className="btn-secondary">Quay lại danh sách đơn</Link>
        </div>
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

      {success && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 1fr)', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '20px' }}>
          <section className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Sản phẩm trong đơn</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {order.items.map((item) => (
                <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Sản phẩm #{item.product_id}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Số lượng: {item.quantity}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>Tạm tính</div>
                    <div style={{ fontWeight: 700 }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {payment && (
            <section className="glass-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Thông tin thanh toán</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Phương thức</div>
                  <div style={{ fontWeight: 700 }}>{payment.method}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Trạng thái</div>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{payment.status}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Mã giao dịch</div>
                  <div style={{ fontWeight: 700, wordBreak: 'break-all' }}>{payment.transaction_id}</div>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="glass-card" style={{ padding: '24px', position: 'sticky', top: '110px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Tổng quan đơn hàng</h2>
          <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
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
              <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Địa chỉ giao hàng</div>
              <div style={{ fontWeight: 500 }}>{order.shipping_address}</div>
            </div>
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Tổng cộng</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_price)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {canPay && (
              <button type="button" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => void handlePay()} disabled={paying}>
                <CreditCard size={18} />
                {paying ? 'Đang thanh toán...' : 'Thanh toán ngay'}
              </button>
            )}
            {canCancel && (
              <button type="button" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => void handleCancel()} disabled={cancelling}>
                <RotateCcw size={18} />
                {cancelling ? 'Đang hủy đơn...' : 'Hủy đơn hàng'}
              </button>
            )}
            <Link to="/orders" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} />
              Xem tất cả đơn hàng
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};
