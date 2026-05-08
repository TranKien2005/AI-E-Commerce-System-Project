import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface SellerRequestResponse {
  item: null | {
    id: number;
    status: string;
    shop_name: string;
    reason: string;
  };
}

export const BuyerSellerRequest: React.FC = () => {
  const [existing, setExisting] = useState<SellerRequestResponse['item']>(null);
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRequest = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<SellerRequestResponse>('/seller-requests/me') as unknown as SellerRequestResponse;
      setExisting(data.item);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải seller request hiện tại'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequest();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/seller-requests', { shop_name: shopName, description, contact });
      setSuccess('Đã gửi yêu cầu trở thành người bán');
      setShopName('');
      setDescription('');
      setContact('');
      await loadRequest();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể gửi seller request'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>Đang tải seller request...</div></div>;
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Đăng ký trở thành người bán</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Gửi thông tin shop để được admin xét duyệt quyền bán hàng.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      {existing && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>Yêu cầu gần nhất của bạn</h2>
          <div style={{ display: 'grid', gap: '8px', color: 'var(--text-secondary)' }}>
            <div>Shop: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{existing.shop_name}</span></div>
            <div>Trạng thái: <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', fontWeight: 600 }}>{existing.status}</span></div>
            {existing.reason && <div>Lý do: <span style={{ color: 'var(--text-primary)' }}>{existing.reason}</span></div>}
          </div>
        </div>
      )}

      <form className="glass-card" style={{ padding: '24px' }} onSubmit={handleSubmit}>
        <div className="input-group"><label className="input-label">Tên shop</label><input className="input-field" value={shopName} onChange={(e) => setShopName(e.target.value)} required /></div>
        <div className="input-group"><label className="input-label">Mô tả</label><textarea className="input-field" style={{ minHeight: '120px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
        <div className="input-group"><label className="input-label">Thông tin liên hệ</label><input className="input-field" value={contact} onChange={(e) => setContact(e.target.value)} required /></div>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Send size={18} />{submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
      </form>
    </div>
  );
};
