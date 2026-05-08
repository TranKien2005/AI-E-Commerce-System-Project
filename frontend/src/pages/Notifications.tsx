import React, { useEffect, useMemo, useState } from 'react';
import { Bell, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface NotificationItem {
  id: number;
  content: string;
  type: string;
  channel: string;
  is_read: boolean;
  created_at: string | null;
}

interface NotificationsResponse {
  items: NotificationItem[];
}

export const Notifications: React.FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readFilter, setReadFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);
  const typeOptions = useMemo(() => Array.from(new Set(items.map((item) => item.type))).sort(), [items]);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesRead = readFilter === 'all' || (readFilter === 'unread' && !item.is_read) || (readFilter === 'read' && item.is_read);
      const matchesType = !typeFilter || item.type === typeFilter;
      return matchesRead && matchesType;
    });
  }, [items, readFilter, typeFilter]);

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<NotificationsResponse>('/notifications') as unknown as NotificationsResponse;
      setItems(data.items || []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải thông báo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const toggleRead = async (id: number, isRead: boolean) => {
    setPendingId(id);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/notifications/${id}/read`, { is_read: !isRead });
      await loadNotifications();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật thông báo'));
    } finally {
      setPendingId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiClient.patch<{ updated: number }>('/notifications/read-all') as unknown as { updated: number };
      await loadNotifications();
      setSuccess(`Đã đánh dấu ${data.updated} thông báo là đã đọc`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể đánh dấu tất cả là đã đọc'));
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>
          Đang tải thông báo...
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Thông báo</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Theo dõi cập nhật mới nhất về đơn hàng và hệ thống. Bạn có {unreadCount} thông báo chưa đọc.</p>
        </div>
        <button className="btn-secondary" onClick={() => void markAllRead()} disabled={markingAll || items.every((item) => item.is_read)}>
          {markingAll ? 'Đang xử lý...' : 'Đánh dấu đã đọc tất cả'}
        </button>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {items.length > 0 && (
        <div className="glass-card" style={{ padding: '18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label className="input-label">Trạng thái</label>
            <select className="input-field" value={readFilter} onChange={(e) => setReadFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="unread">Chưa đọc</option>
              <option value="read">Đã đọc</option>
            </select>
          </div>
          <div>
            <label className="input-label">Loại thông báo</label>
            <select className="input-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tất cả</option>
              {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredItems.length}/{items.length} thông báo</div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Bell size={40} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Chưa có thông báo nào</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Thông báo hệ thống và đơn hàng sẽ xuất hiện tại đây.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Bell size={40} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Không có thông báo phù hợp</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Hãy thử đổi bộ lọc trạng thái hoặc loại thông báo.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredItems.map((item) => (
            <div key={item.id} className="glass-card" style={{ padding: '20px', borderColor: item.is_read ? 'var(--glass-border)' : 'rgba(59, 130, 246, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700 }}>{item.type}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{item.channel}</span>
                    {!item.is_read && <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '999px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>Mới</span>}
                  </div>
                  <p style={{ marginBottom: '8px' }}>{item.content}</p>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'N/A'}
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => void toggleRead(item.id, item.is_read)} disabled={pendingId === item.id}>
                  {pendingId === item.id ? 'Đang lưu...' : item.is_read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
