import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Lock, Mail, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { email, otp, new_password: newPassword });
      setSuccess('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.');
      window.setTimeout(() => navigate('/login'), 1200);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể đặt lại mật khẩu'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Đặt lại mật khẩu</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Nhập OTP đã nhận và mật khẩu mới.</p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
        {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group"><label className="input-label">Email</label><div style={{ position: 'relative' }}><Mail size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} /><input type="email" className="input-field" style={{ paddingLeft: '40px' }} value={email} onChange={(e) => setEmail(e.target.value)} required /></div></div>
          <div className="input-group"><label className="input-label">OTP</label><div style={{ position: 'relative' }}><ShieldCheck size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} /><input className="input-field" style={{ paddingLeft: '40px', letterSpacing: '4px' }} value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required /></div></div>
          <div className="input-group"><label className="input-label">Mật khẩu mới</label><div style={{ position: 'relative' }}><Lock size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} /><input type="password" className="input-field" style={{ paddingLeft: '40px' }} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div></div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>{loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Chưa có OTP? <Link to="/forgot-password" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Gửi lại OTP</Link>
        </p>
      </div>
    </div>
  );
};
