import React, { useCallback, useEffect, useState } from 'react';
import { Save, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface UserItem {
  id: number;
  email: string;
  role: string;
  status: string;
}

interface UsersResponse {
  items: UserItem[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

const defaultMeta = { page: 1, page_size: 10, total: 0, total_pages: 1 };

export const AdminUsers: React.FC = () => {
  const [items, setItems] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState(defaultMeta);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(nextPage), page_size: String(defaultMeta.page_size) });
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      if (appliedKeyword.trim()) params.set('keyword', appliedKeyword.trim());
      const data = await apiClient.get<UsersResponse>(`/admin/users?${params.toString()}`) as unknown as UsersResponse;
      setItems(data.items || []);
      setMeta(data.meta || defaultMeta);
      setPage(data.meta?.page || nextPage);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải danh sách người dùng'));
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page, role, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers(page);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadUsers, page]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedKeyword(keyword);
    setPage(1);
  };

  const clearFilters = () => {
    setRole('');
    setStatus('');
    setKeyword('');
    setAppliedKeyword('');
    setPage(1);
  };

  const updateUser = async (user: UserItem, patch: Partial<UserItem>) => {
    setSavingId(user.id);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/admin/users/${user.id}`, { role: patch.role ?? user.role, status: patch.status ?? user.status });
      setSuccess('Cập nhật người dùng thành công');
      await loadUsers();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể cập nhật người dùng'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Quản lý người dùng</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Tìm kiếm, lọc và cập nhật role/trạng thái tài khoản.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <form className="glass-card" style={{ padding: '18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }} onSubmit={applyFilters}>
        <div>
          <label className="input-label">Từ khóa</label>
          <input className="input-field" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Email hoặc tên" />
        </div>
        <div>
          <label className="input-label">Role</label>
          <select className="input-field" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="buyer">buyer</option>
            <option value="seller">seller</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div>
          <label className="input-label">Status</label>
          <select className="input-field" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="active">active</option>
            <option value="pending_verification">pending_verification</option>
            <option value="suspended">suspended</option>
          </select>
        </div>
        <button className="btn-primary" type="submit" style={{ justifyContent: 'center' }}><Search size={18} />Lọc</button>
        <button className="btn-secondary" type="button" onClick={clearFilters}>Xóa lọc</button>
      </form>

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải người dùng...</p> : items.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Không tìm thấy người dùng nào.</p> : (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng: {meta.total} người dùng • Trang {meta.page}/{meta.total_pages || 1}</div>
            {items.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '18px', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.email}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>User ID: #{item.id}</div>
                  </div>
                  <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => void updateUser(item, {})} disabled={savingId === item.id}><Save size={16} />{savingId === item.id ? 'Đang lưu...' : 'Lưu nhanh'}</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="input-label">Role</label>
                    <select className="input-field" value={item.role} onChange={(e) => setItems((prev) => prev.map((user) => user.id === item.id ? { ...user, role: e.target.value } : user))}>
                      <option value="buyer">buyer</option>
                      <option value="seller">seller</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Status</label>
                    <select className="input-field" value={item.status} onChange={(e) => setItems((prev) => prev.map((user) => user.id === item.id ? { ...user, status: e.target.value } : user))}>
                      <option value="active">active</option>
                      <option value="pending_verification">pending_verification</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Trang trước</button>
              <span style={{ color: 'var(--text-secondary)' }}>Trang {meta.page}/{meta.total_pages || 1}</span>
              <button className="btn-secondary" disabled={page >= meta.total_pages} onClick={() => setPage((prev) => prev + 1)}>Trang sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
