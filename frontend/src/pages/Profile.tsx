import React, { useEffect, useState } from 'react';
import { User, Mail, Shield, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/useAuth';
import { getErrorMessage } from '../utils/errors';

interface ProfileResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status?: string;
}

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<ProfileResponse>('/users/me') as unknown as ProfileResponse;
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        setRole(data.role || '');
        setStatus(data.status);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải thông tin cá nhân'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }

    setSaving(true);
    try {
      const data = await apiClient.put<ProfileResponse>('/users/me', { full_name: fullName.trim() }) as unknown as ProfileResponse;
      setFullName(data.full_name || fullName.trim());
      await refreshUser();
      setSuccess('Cập nhật thông tin thành công');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Cập nhật thông tin thất bại'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>
          Đang tải hồ sơ của bạn...
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Thông tin tài khoản</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Quản lý hồ sơ cá nhân và kiểm tra trạng thái đăng nhập của bạn.
          </p>
        </header>

        <div className="glass-card" style={{ padding: '28px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px', marginBottom: '28px' }}>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={18} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Email</div>
                <div style={{ fontWeight: 500 }}>{email || user?.email}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={18} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Vai trò</div>
                  <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{role || user?.role}</div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={18} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Trạng thái</div>
                  <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{status || 'active'}</div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Họ và tên</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={saving}>
              <Save size={18} />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
