import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface SellerRequestItem {
  id: number;
  user_id: number;
  shop_name: string;
  status: string;
}

interface SellerRequestsResponse {
  items: SellerRequestItem[];
}

export const AdminSellerRequests: React.FC = () => {
  const [items, setItems] = useState<SellerRequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [reasonMap, setReasonMap] = useState<Record<number, string>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredItems = useMemo(() => {
    if (!statusFilter) return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<SellerRequestsResponse>('/admin/seller-requests') as unknown as SellerRequestsResponse;
      setItems(data.items || []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải seller requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const moderate = async (id: number, action: 'approve' | 'reject') => {
    setPendingId(id);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/admin/seller-requests/${id}`, { action, reason: reasonMap[id] || '' });
      setSuccess(action === 'approve' ? 'Đã duyệt seller request' : 'Đã từ chối seller request');
      await loadRequests();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể xử lý seller request'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Seller Requests</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Duyệt hoặc từ chối các yêu cầu trở thành người bán.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <div className="glass-card" style={{ padding: '18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="input-label" style={{ marginBottom: 0 }}>Status</label>
        <select className="input-field" style={{ maxWidth: '220px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredItems.length}/{items.length} requests</span>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p> : filteredItems.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Không có seller request phù hợp.</p> : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredItems.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '20px', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{item.shop_name}</div>
                  <span style={{ color: item.status === 'pending' ? 'var(--warning)' : item.status === 'approved' ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>{item.status}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Request #{item.id} • User #{item.user_id}</div>
                {item.status === 'pending' && (
                  <>
                    <textarea className="input-field" style={{ minHeight: '90px', resize: 'vertical' }} placeholder="Lý do khi từ chối (nếu có)" value={reasonMap[item.id] || ''} onChange={(e) => setReasonMap((prev) => ({ ...prev, [item.id]: e.target.value }))} />
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button className="btn-primary" disabled={pendingId === item.id} onClick={() => void moderate(item.id, 'approve')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} />Duyệt</button>
                      <button className="btn-secondary" disabled={pendingId === item.id} onClick={() => void moderate(item.id, 'reject')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}><XCircle size={18} />Từ chối</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
