import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/useAuth';
import { getErrorMessage } from '../utils/errors';

interface MessageItem {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_bot: boolean;
  is_read: boolean;
  created_at: string | null;
}

interface MessagesResponse {
  items: MessageItem[];
}

export const ChatDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [content, setContent] = useState('');
  const [messageFilter, setMessageFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      if (messageFilter === 'mine') return message.sender_id === user?.id;
      if (messageFilter === 'others') return message.sender_id !== user?.id;
      if (messageFilter === 'bot') return message.is_bot;
      return true;
    });
  }, [messageFilter, messages, user?.id]);

  const loadMessages = useCallback(async () => {
    if (!id) {
      setError('Không tìm thấy hội thoại');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<MessagesResponse>(`/chat/conversations/${id}/messages`) as unknown as MessagesResponse;
      setMessages(data.items || []);
      await apiClient.patch(`/chat/conversations/${id}/read`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải tin nhắn'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMessages();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !content.trim()) return;
    setSending(true);
    setError('');
    try {
      await apiClient.post(`/chat/conversations/${id}/messages`, { content: content.trim() });
      setContent('');
      await loadMessages();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể gửi tin nhắn'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Hội thoại #{id}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gửi và nhận tin nhắn trong cuộc hội thoại này.</p>
        </div>
        <Link to="/chat" className="btn-secondary">Tất cả hội thoại</Link>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}

      <div className="glass-card" style={{ padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredMessages.length}/{messages.length} tin nhắn</div>
        <select className="input-field" style={{ maxWidth: '180px' }} value={messageFilter} onChange={(e) => setMessageFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="mine">Tin của tôi</option>
          <option value="others">Tin đối phương</option>
          <option value="bot">Tin bot</option>
        </select>
      </div>

      <section className="glass-card" style={{ padding: '24px', marginBottom: '20px', minHeight: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải tin nhắn...</p> : messages.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa có tin nhắn nào.</p> : filteredMessages.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Không có tin nhắn phù hợp bộ lọc.</p> : filteredMessages.map((message) => {
          const mine = message.sender_id === user?.id;
          return (
            <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div className="glass-card" style={{ maxWidth: '70%', padding: '12px 14px', background: mine ? 'rgba(59, 130, 246, 0.18)' : 'var(--glass-bg)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{mine ? 'Bạn' : `User #${message.sender_id}`}{message.is_bot ? ' • Bot' : ''}</div>
                <div>{message.content}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>{message.created_at ? new Date(message.created_at).toLocaleString('vi-VN') : ''}</div>
              </div>
            </div>
          );
        })}
      </section>

      <form className="glass-card" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'end' }} onSubmit={handleSubmit}>
        <div>
          <textarea className="input-field" style={{ minHeight: '54px', maxHeight: '160px', resize: 'vertical' }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập tin nhắn..." />
          <div style={{ color: content.trim().length > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontSize: '12px', marginTop: '6px' }}>{content.trim().length} ký tự</div>
        </div>
        <button type="submit" className="btn-primary" disabled={sending || !content.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '54px' }}><Send size={18} />{sending ? 'Đang gửi...' : 'Gửi'}</button>
      </form>
    </div>
  );
};
