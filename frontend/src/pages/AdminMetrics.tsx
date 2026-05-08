import React, { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, FileText, Package, ShoppingBag, Store, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface MetricsResponse {
  users: number;
  orders: number;
  payments: number;
  products: number;
  shops: number;
  pending_seller_requests: number;
  pending_reports: number;
  successful_payments: number;
  revenue: number;
}

const initialMetrics: MetricsResponse = {
  users: 0,
  orders: 0,
  payments: 0,
  products: 0,
  shops: 0,
  pending_seller_requests: 0,
  pending_reports: 0,
  successful_payments: 0,
  revenue: 0,
};

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export const AdminMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsResponse>(initialMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<MetricsResponse>('/admin/metrics') as unknown as MetricsResponse;
        setMetrics({ ...initialMetrics, ...data });
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải metrics'));
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadMetrics();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const cards = [
    { label: 'Users', value: metrics.users, icon: <Users size={22} color="var(--accent-primary)" /> },
    { label: 'Orders', value: metrics.orders, icon: <ShoppingBag size={22} color="var(--accent-primary)" /> },
    { label: 'Payments', value: metrics.payments, icon: <CreditCard size={22} color="var(--accent-primary)" /> },
    { label: 'Products', value: metrics.products, icon: <Package size={22} color="var(--accent-primary)" /> },
    { label: 'Shops', value: metrics.shops, icon: <Store size={22} color="var(--accent-primary)" /> },
    { label: 'Pending seller requests', value: metrics.pending_seller_requests, icon: <Store size={22} color="var(--warning)" /> },
    { label: 'Pending reports', value: metrics.pending_reports, icon: <FileText size={22} color="var(--warning)" /> },
    { label: 'Successful payments', value: metrics.successful_payments, icon: <CreditCard size={22} color="var(--success)" /> },
    { label: 'Revenue', value: formatCurrency(metrics.revenue), icon: <CreditCard size={22} color="var(--success)" /> },
  ];

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>System Metrics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Theo dõi các chỉ số tổng quan từ dữ liệu hiện tại.</p>
      </header>
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {cards.map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '10px' }}>{card.icon}</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>{card.label}</div>
            <div style={{ fontWeight: 700, fontSize: '24px' }}>{loading ? '...' : card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
