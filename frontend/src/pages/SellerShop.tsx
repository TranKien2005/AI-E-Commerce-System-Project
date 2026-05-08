import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface ShopResponse {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  status: string;
  created_at: string | null;
}

export const SellerShop: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadShop = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<ShopResponse>('/seller/shop') as unknown as ShopResponse;
      setName(data.name || '');
      setDescription(data.description || '');
      setStatus(data.status || '');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải thông tin cửa hàng'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadShop();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.put('/seller/shop', { name, description });
      await loadShop();
      setSuccess('Cập nhật cửa hàng thành công');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật cửa hàng'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>Đang tải thông tin cửa hàng...</div></div>;
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Thông tin cửa hàng</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Quản lý tên, mô tả và trạng thái hiện tại của shop.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '24px', alignItems: 'start' }}>
        <form className="glass-card" style={{ padding: '24px' }} onSubmit={handleSubmit}>
          <div className="input-group"><label className="input-label">Tên cửa hàng</label><input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="input-group"><label className="input-label">Mô tả</label><textarea className="input-field" style={{ minHeight: '140px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={18} />{saving ? 'Đang lưu...' : 'Lưu thông tin shop'}</button>
        </form>

        <aside className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Tổng quan</h2>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>Trạng thái shop</div>
          <div style={{ fontWeight: 700, textTransform: 'capitalize', marginBottom: '16px' }}>{status || 'N/A'}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Thông tin tại đây sẽ hiển thị cho người mua khi truy cập shop của bạn.</p>
        </aside>
      </div>
    </div>
  );
};
