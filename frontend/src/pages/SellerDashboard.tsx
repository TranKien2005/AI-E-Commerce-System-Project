import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, TrendingUp, Package, ShoppingBag, AlertCircle, MessageCircle, Settings } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface StatsResponse {
  revenue: number;
  orders: number;
  best_selling: Array<{ id: number; name: string; sold: number }>;
}

interface ShopResponse {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  status: string;
  created_at: string | null;
}

export const SellerDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse>({ revenue: 0, orders: 0, best_selling: [] });
  const [shop, setShop] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsData, shopData] = await Promise.all([
          apiClient.get<StatsResponse>('/seller/stats') as unknown as Promise<StatsResponse>,
          apiClient.get<ShopResponse>('/seller/shop') as unknown as Promise<ShopResponse>,
        ]);
        setStats(statsData);
        setShop(shopData);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải bảng điều khiển người bán'));
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="glass-card" style={{ padding: '24px 28px', color: 'var(--text-secondary)' }}>Đang tải dashboard người bán...</div></div>;
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Seller Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Quản lý cửa hàng, đơn hàng và hiệu suất kinh doanh của bạn.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px' }}><Store size={20} color="var(--accent-primary)" style={{ marginBottom: '10px' }} /><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Cửa hàng</div><div style={{ fontWeight: 700, fontSize: '20px' }}>{shop?.name || 'Chưa có cửa hàng'}</div></div>
        <div className="glass-card" style={{ padding: '20px' }}><TrendingUp size={20} color="var(--accent-primary)" style={{ marginBottom: '10px' }} /><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Doanh thu</div><div style={{ fontWeight: 700, fontSize: '20px' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.revenue)}</div></div>
        <div className="glass-card" style={{ padding: '20px' }}><ShoppingBag size={20} color="var(--accent-primary)" style={{ marginBottom: '10px' }} /><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Đơn hàng</div><div style={{ fontWeight: 700, fontSize: '20px' }}>{stats.orders}</div></div>
        <div className="glass-card" style={{ padding: '20px' }}><Package size={20} color="var(--accent-primary)" style={{ marginBottom: '10px' }} /><div style={{ color: 'var(--text-tertiary)', fontSize: '12px', textTransform: 'uppercase' }}>Trạng thái shop</div><div style={{ fontWeight: 700, fontSize: '20px', textTransform: 'capitalize' }}>{shop?.status || 'N/A'}</div></div>
      </div>

      <section className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Thao tác nhanh</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <Link to="/seller/products" className="btn-primary" style={{ justifyContent: 'center' }}><Package size={18} />Quản lý sản phẩm</Link>
          <Link to="/seller/orders" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><ShoppingBag size={18} />Xử lý đơn hàng</Link>
          <Link to="/seller/shop" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><Settings size={18} />Cài đặt shop</Link>
          <Link to="/seller/chatbot" className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><MessageCircle size={18} />Chatbot</Link>
        </div>
      </section>

      <section className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>Sản phẩm bán chạy</h2>
        {stats.best_selling.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu bán hàng để hiển thị.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {stats.best_selling.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>ID sản phẩm: #{item.id}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{item.sold} đã bán</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
