import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError('Vui lòng nhập họ và tên');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email không hợp lệ');
      return false;
    }
    const pass = formData.password;
    if (pass.length < 8 || !/[A-Z]/.test(pass) || !/[a-z]/.test(pass) || !/[0-9]/.test(pass) || !/[^A-Za-z0-9]/.test(pass)) {
      setError('Mật khẩu phải từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await apiClient.post('/auth/register', formData);
      setStep('otp');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Đăng ký thất bại'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/auth/verify-otp', { email: formData.email, otp });
      navigate('/login');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Xác thực OTP thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card" 
        style={{ width: '100%', maxWidth: '450px', padding: '40px' }}
      >
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ 
                  background: 'var(--accent-gradient)', 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <UserPlus size={30} color="white" />
                </div>
                <h1 style={{ fontSize: '24px' }}>Tạo tài khoản mới</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tham gia cộng đồng mua sắm thông minh ngay hôm nay.</p>
              </div>

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

              <form onSubmit={handleRegister}>
                <div className="input-group">
                  <label className="input-label">Họ và tên</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ paddingLeft: '40px' }}
                      placeholder="Nguyễn Văn A"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="email" 
                      className="input-field" 
                      style={{ paddingLeft: '40px' }}
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Mật khẩu</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="password" 
                      className="input-field" 
                      style={{ paddingLeft: '40px' }}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Tiếp tục'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '1px solid var(--success)'
                }}>
                  <CheckCircle size={30} color="var(--success)" />
                </div>
                <h1 style={{ fontSize: '24px' }}>Xác thực Email</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Chúng tôi đã gửi mã OTP đến <b>{formData.email}</b>.</p>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Vui lòng kiểm tra MailHog tại http://localhost:8025</p>
              </div>

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

              <form onSubmit={handleVerifyOtp}>
                <div className="input-group">
                  <label className="input-label">Mã OTP (6 chữ số)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 }}
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Hoàn tất đăng ký'}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setStep('form')}
                  className="btn-secondary" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                >
                  Quay lại
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
};
