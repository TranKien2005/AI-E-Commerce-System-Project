import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MessageCircle, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface ConversationItem {
  id: number;
  buyer_id: number;
  seller_id: number;
  is_bot_enabled: boolean;
}

interface ConversationsResponse {
  items: ConversationItem[];
}

export const ChatList: React.FC = () => {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [botFilter, setBotFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKeyword = !normalizedKeyword || String(item.id).includes(normalizedKeyword) || String(item.buyer_id).includes(normalizedKeyword) || String(item.seller_id).includes(normalizedKeyword);
      const matchesBot = botFilter === 'all' || (botFilter === 'bot' && item.is_bot_enabled) || (botFilter === 'manual' && !item.is_bot_enabled);
      return matchesKeyword && matchesBot;
    });
  }, [botFilter, items, keyword]);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<ConversationsResponse>('/chat/conversations') as unknown as ConversationsResponse;
        setItems(data.items || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải danh sách hội thoại'));
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadConversations();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Tin nhắn</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Trao đổi với người bán hoặc người mua trong hệ thống.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}

      {items.length > 0 && (
        <div className="glass-card" style={{ padding: '18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label className="input-label">Tìm kiếm</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input className="input-field" style={{ paddingLeft: '38px' }} placeholder="ID hội thoại, buyer, seller" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="input-label">Chế độ</label>
            <select className="input-field" value={botFilter} onChange={(e) => setBotFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="bot">Bot enabled</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredItems.length}/{items.length} hội thoại</div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải hội thoại...</p> : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px' }}>
            <MessageCircle size={42} color="var(--text-tertiary)" style={{ marginBottom: '14px' }} />
            <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Chưa có hội thoại nào</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Bạn có thể mở chat từ trang chi tiết sản phẩm.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px' }}>
            <MessageCircle size={42} color="var(--text-tertiary)" style={{ marginBottom: '14px' }} />
            <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Không có hội thoại phù hợp</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Thử đổi từ khóa hoặc bộ lọc.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {filteredItems.map((item) => (
              <Link key={item.id} to={`/chat/${item.id}`} className="glass-card" style={{ padding: '18px', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Hội thoại #{item.id}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Buyer #{item.buyer_id} • Seller #{item.seller_id}</div>
                </div>
                <span style={{ color: item.is_bot_enabled ? 'var(--success)' : 'var(--text-tertiary)', fontSize: '13px' }}>{item.is_bot_enabled ? 'Bot enabled' : 'Manual'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
