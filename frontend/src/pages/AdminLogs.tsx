import React, { useEffect, useState } from 'react';
import { AlertCircle, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface LogItem {
  id: number;
  admin_id: number;
  action: string;
  target_type: string;
  target_id: number;
  description: string;
  created_at: string | null;
}

interface LogsResponse {
  items: LogItem[];
}

export const AdminLogs: React.FC = () => {
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<LogsResponse>('/admin/logs') as unknown as LogsResponse;
        setItems(data.items || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải system logs'));
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
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>System Logs</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Xem 50 audit log admin mới nhất.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải logs...</p> : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px' }}><FileText size={42} color="var(--text-tertiary)" style={{ marginBottom: '14px' }} /><h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Chưa có log nào</h2><p style={{ color: 'var(--text-secondary)' }}>Chưa có thao tác admin nào được ghi nhận.</p></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead>
              <tr style={{ color: 'var(--text-tertiary)', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Action</th>
                <th style={{ padding: '10px' }}>Target</th>
                <th style={{ padding: '10px' }}>Admin</th>
                <th style={{ padding: '10px' }}>Time</th>
                <th style={{ padding: '10px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px 10px' }}>#{item.id}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--accent-primary)', fontWeight: 600 }}>{item.action}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{item.target_type} #{item.target_id}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>#{item.admin_id}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '-'}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{item.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
