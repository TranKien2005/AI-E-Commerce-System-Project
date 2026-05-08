import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useCart } from '../context/useCart';
import { getErrorMessage } from '../utils/errors';

interface CreateOrderResponse {
  order_id: number;
}

export const Cart: React.FC = () => {
  const { items, loading, subtotal, updateCartItem, removeCartItem, refreshCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState('');
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const invalidItems = useMemo(() => items.filter((item) => item.stock <= 0 || item.quantity > item.stock), [items]);
  const canCheckout = items.length > 0 && invalidItems.length === 0 && shippingAddress.trim().length >= 10;

  const handleQuantityChange = async (itemId: number, nextQuantity: number) => {
    if (nextQuantity < 1) {
      return;
    }

    setError('');
    setSuccess('');
    setPendingItemId(itemId);
    try {
      await updateCartItem(itemId, nextQuantity);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật số lượng sản phẩm'));
    } finally {
      setPendingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    setError('');
    setSuccess('');
    setPendingItemId(itemId);
    try {
      await removeCartItem(itemId);
      setSuccess('Đã xóa sản phẩm khỏi giỏ hàng');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể xóa sản phẩm khỏi giỏ hàng'));
    } finally {
      setPendingItemId(null);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (invalidItems.length > 0) {
      setError('Vui lòng điều chỉnh hoặc xóa sản phẩm hết hàng/vượt tồn kho trước khi tạo đơn');
      return;
    }

    if (shippingAddress.trim().length < 10) {
      setError('Vui lòng nhập địa chỉ giao hàng đầy đủ hơn');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiClient.post<CreateOrderResponse>('/orders', { shipping_address: shippingAddress.trim() }) as unknown as CreateOrderResponse;
      await refreshCart();
      navigate(`/orders/${data.order_id}`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tạo đơn hàng'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>
          Đang tải giỏ hàng...
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Giỏ hàng của bạn</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Kiểm tra lại sản phẩm trước khi tạo đơn hàng.
        </p>
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

      {items.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <ShoppingCart size={40} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Giỏ hàng đang trống</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Hãy quay về trang chủ và thêm một vài sản phẩm trước khi đặt hàng.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 1fr)', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            {items.map((item) => {
              const lineTotal = (item.price || 0) * item.quantity;
              const isPending = pendingItemId === item.item_id;
              return (
                <div key={item.item_id} className="glass-card" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: '20px' }}>
                  <div style={{ width: '120px', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                    {item.primary_image ? (
                      <img src={item.primary_image} alt={item.name || 'Product image'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                        No image
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{item.name || `Sản phẩm #${item.product_id}`}</h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tồn kho hiện tại: {item.stock}</div>
                      </div>
                      <button
                        onClick={() => void handleRemoveItem(item.item_id)}
                        disabled={isPending}
                        className="btn-secondary"
                        style={{ padding: '10px', color: 'var(--error)', alignSelf: 'start' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {(item.stock <= 0 || item.quantity > item.stock) && (
                      <div style={{ color: 'var(--error)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />Sản phẩm không đủ tồn kho để đặt hàng
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price || 0)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px' }}>
                          <button
                            onClick={() => void handleQuantityChange(item.item_id, item.quantity - 1)}
                            disabled={isPending || item.quantity <= 1}
                            className="btn-secondary"
                            style={{ padding: '8px' }}
                          >
                            <Minus size={16} />
                          </button>
                          <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                          <button
                            onClick={() => void handleQuantityChange(item.item_id, item.quantity + 1)}
                            disabled={isPending || item.quantity >= item.stock}
                            className="btn-secondary"
                            style={{ padding: '8px' }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Thành tiền</div>
                          <div style={{ fontWeight: 700 }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(lineTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="glass-card" style={{ padding: '24px', position: 'sticky', top: '110px' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Tóm tắt đơn hàng</h2>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Số lượng sản phẩm</span>
                <span>{totalItems}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Tạm tính</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700 }}>
                <span>Tổng cộng</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</span>
              </div>
            </div>

            {invalidItems.length > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
                Có {invalidItems.length} sản phẩm cần chỉnh lại tồn kho trước khi tạo đơn.
              </div>
            )}

            <form onSubmit={handleCheckout}>
              <div className="input-group">
                <label className="input-label">Địa chỉ giao hàng</label>
                <textarea
                  className="input-field"
                  style={{ minHeight: '110px', resize: 'vertical' }}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  required
                />
                <div style={{ color: shippingAddress.trim().length >= 10 ? 'var(--success)' : 'var(--text-tertiary)', fontSize: '12px', marginTop: '6px' }}>
                  {shippingAddress.trim().length >= 10 ? 'Địa chỉ đã đủ điều kiện tạo đơn' : 'Nhập tối thiểu 10 ký tự để tạo đơn'}
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: canCheckout ? 1 : 0.65 }} disabled={submitting || !canCheckout}>
                {submitting ? 'Đang tạo đơn...' : 'Tạo đơn hàng'}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
};
