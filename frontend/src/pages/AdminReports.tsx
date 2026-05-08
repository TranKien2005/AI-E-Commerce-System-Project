import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Save } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface ReportItem {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  status: string;
}

interface ReportsResponse {
  items: ReportItem[];
}

export const AdminReports: React.FC = () => {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [targetFilter, setTargetFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesTarget = !targetFilter || item.target_type === targetFilter;
      return matchesStatus && matchesTarget;
    });
  }, [items, statusFilter, targetFilter]);

  const targetTypes = useMemo(() => Array.from(new Set(items.map((item) => item.target_type))).sort(), [items]);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<ReportsResponse>('/admin/reports') as unknown as ReportsResponse;
      setItems(data.items || []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải danh sách báo cáo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReports();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const updateStatus = async (item: ReportItem) => {
    setPendingId(item.id);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/admin/reports/${item.id}`, { status: item.status });
      setSuccess('Cập nhật trạng thái báo cáo thành công');
      await loadReports();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật báo cáo'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Reports Moderation</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Lọc và xử lý các báo cáo từ người dùng.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <div className="glass-card" style={{ padding: '18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
        <div>
          <label className="input-label">Status</label>
          <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="pending">pending</option>
            <option value="reviewing">reviewing</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <div>
          <label className="input-label">Target type</label>
          <select className="input-field" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
            <option value="">Tất cả</option>
            {targetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredItems.length}/{items.length} reports</div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải báo cáo...</p> : filteredItems.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Không có báo cáo phù hợp.</p> : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredItems.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '20px', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{item.target_type} #{item.target_id}</div>
                  <span style={{ color: item.status === 'pending' ? 'var(--warning)' : item.status === 'resolved' ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 700 }}>{item.status}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{item.reason}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label className="input-label">Trạng thái</label>
                    <select className="input-field" value={item.status} onChange={(e) => setItems((prev) => prev.map((report) => report.id === item.id ? { ...report, status: e.target.value } : report))}>
                      <option value="pending">pending</option>
                      <option value="reviewing">reviewing</option>
                      <option value="resolved">resolved</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </div>
                  <button className="btn-primary" disabled={pendingId === item.id} onClick={() => void updateStatus(item)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={18} />Lưu</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
