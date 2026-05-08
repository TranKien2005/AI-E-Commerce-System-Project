import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Flag, FileText, AlertCircle, BarChart3, ScrollText, Shield } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface UsersResponse { items: Array<{ id: number; email: string; role: string; status: string }>; meta: { page: number; page_size: number; total: number; total_pages: number } }
interface SellerRequestsResponse { items: Array<{ id: number; user_id: number; shop_name: string; status: string }> }
interface ReportsResponse { items: Array<{ id: number; target_type: string; target_id: number; reason: string; status: string }> }

export const AdminDashboard: React.FC = () => {
  const [usersCount, setUsersCount] = useState(0);
  const [sellerRequestsCount, setSellerRequestsCount] = useState(0);
  const [pendingSellerRequestsCount, setPendingSellerRequestsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [users, sellerRequests, reports] = await Promise.all([
          apiClient.get<UsersResponse>('/admin/users') as unknown as Promise<UsersResponse>,
          apiClient.get<SellerRequestsResponse>('/admin/seller-requests') as unknown as Promise<SellerRequestsResponse>,
          apiClient.get<ReportsResponse>('/admin/reports') as unknown as Promise<ReportsResponse>,
        ]);
        setUsersCount(users.meta.total);
        setSellerRequestsCount(sellerRequests.items.length);
        setPendingSellerRequestsCount(sellerRequests.items.filter((item) => item.status === 'pending').length);
        setReportsCount(reports.items.length);
        setPendingReportsCount(reports.items.filter((item) => item.status === 'pending').length);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải dashboard admin'));
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Theo dõi nhanh người dùng, yêu cầu người bán và báo cáo hệ thống.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px' }}><Users size={20} color="var(--accent-primary)" style={{ marginBottom: '10px' }} /><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Người dùng</div><div style={{ fontWeight: 700, fontSize: '20px' }}>{loading ? '...' : usersCount}</div></div>
        <div className="glass-card" style={{ padding: '20px' }}><FileText size={20} color="var(--accent-primary)" style={{ marginBottom: '10px' }} /><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Yêu cầu seller</div><div style={{ fontWeight: 700, fontSize: '20px' }}>{loading ? '...' : sellerRequestsCount}</div><div style={{ color: 'var(--warning)', fontSize: '13px' }}>{loading ? '' : `${pendingSellerRequestsCount} pending`}</div></div>
        <div className="glass-card" style={{ padding: '20px' }}><Flag size={20} color="var(--accent-primary)" style={{ marginBottom: '10px' }} /><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Báo cáo</div><div style={{ fontWeight: 700, fontSize: '20px' }}>{loading ? '...' : reportsCount}</div><div style={{ color: 'var(--warning)', fontSize: '13px' }}>{loading ? '' : `${pendingReportsCount} pending`}</div></div>
      </div>

      <section className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Thao tác nhanh</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <Link to="/admin/users" className="btn-primary" style={{ justifyContent: 'center' }}><Users size={18} />Quản lý users</Link>
          <Link to="/admin/seller-requests" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><Shield size={18} />Duyệt seller</Link>
          <Link to="/admin/reports" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><Flag size={18} />Xử lý reports</Link>
          <Link to="/admin/metrics" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><BarChart3 size={18} />Metrics</Link>
          <Link to="/admin/logs" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><ScrollText size={18} />System logs</Link>
        </div>
      </section>
    </div>
  );
};
