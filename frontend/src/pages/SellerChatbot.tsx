import React, { useEffect, useState } from 'react';
import { Bot, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface ChatbotConfigResponse {
  api_key: string | null;
  prompt: string;
  template: string;
  is_enabled: boolean;
}

export const SellerChatbot: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<ChatbotConfigResponse>('/seller/chatbot-config') as unknown as ChatbotConfigResponse;
      setApiKey(data.api_key || '');
      setPrompt(data.prompt || '');
      setTemplate(data.template || '');
      setIsEnabled(Boolean(data.is_enabled));
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải cấu hình chatbot'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadConfig();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch('/seller/chatbot-config', {
        api_key: apiKey,
        prompt,
        template,
        is_enabled: isEnabled,
      });
      setSuccess('Cập nhật cấu hình chatbot thành công');
      await loadConfig();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật chatbot config'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>Đang tải cấu hình chatbot...</div></div>;
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Seller Chatbot</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Cấu hình trợ lý AI hỗ trợ tư vấn khách hàng cho shop của bạn.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <form className="glass-card" style={{ padding: '24px' }} onSubmit={handleSubmit}>
        <div className="input-group"><label className="input-label">API Key</label><input className="input-field" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." /></div>
        <div className="input-group"><label className="input-label">Prompt hệ thống</label><textarea className="input-field" style={{ minHeight: '140px', resize: 'vertical' }} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
        <div className="input-group"><label className="input-label">Template trả lời</label><textarea className="input-field" style={{ minHeight: '140px', resize: 'vertical' }} value={template} onChange={(e) => setTemplate(e.target.value)} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          Bật chatbot tự động trả lời
        </label>
        <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} />{saving ? 'Đang lưu...' : 'Lưu cấu hình chatbot'}</button>
      </form>
    </div>
  );
};
