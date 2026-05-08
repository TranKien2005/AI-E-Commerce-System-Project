import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface AuditLogItem {
  id: number;
  action: string;
  target_type: string;
  target_id: number;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
}

export const AdminAuditLogs: React.FC = () => {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<AuditLogsResponse>('/admin/audit-logs') as unknown as AuditLogsResponse;
        setItems(data.items || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải audit logs'));
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadLogs();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Audit Logs</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Theo dõi các hành động quản trị quan trọng trong hệ thống.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải audit logs...</p> : items.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa có audit log nào.</p> : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {items.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '100px 1fr 140px 120px', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>#{item.id}</div>
                <div>{item.action}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{item.target_type}</div>
                <div style={{ textAlign: 'right' }}>#{item.target_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
