import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import { ShoppingCart, User, LogOut, ShoppingBag, Search, Bell, Store, Shield, MessageCircle, ChevronDown } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
}

const buyerLinks: NavItem[] = [
  { to: '/orders', label: 'Đơn hàng' },
  { to: '/seller-request', label: 'Become Seller' },
  { to: '/reviews/new', label: 'Review' },
  { to: '/reports/new', label: 'Report' },
];

const sellerLinks: NavItem[] = [
  { to: '/seller', label: 'Dashboard' },
  { to: '/seller/shop', label: 'Shop' },
  { to: '/seller/products', label: 'Products' },
  { to: '/seller/orders', label: 'Orders' },
  { to: '/seller/chatbot', label: 'Chatbot' },
];

const adminLinks: NavItem[] = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/seller-requests', label: 'Seller Requests' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/audit-logs', label: 'Audit' },
  { to: '/admin/metrics', label: 'Metrics' },
  { to: '/admin/logs', label: 'Logs' },
];

const MenuGroup: React.FC<{ label: string; icon?: React.ReactNode; links: NavItem[] }> = ({ label, icon, links }) => (
  <div className="nav-menu-group">
    <button type="button" className="btn-secondary nav-menu-button">
      {icon}
      <span>{label}</span>
      <ChevronDown size={14} />
    </button>
    <div className="glass-card nav-menu-panel">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className="nav-menu-link">
          {link.label}
        </Link>
      ))}
    </div>
  </div>
);

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-card app-navbar">
      <Link to="/" className="navbar-brand">
        <div style={{ background: 'var(--accent-gradient)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
          <ShoppingBag size={24} color="white" />
        </div>
        <span>AI-ECOMMERCE</span>
      </Link>

      <form onSubmit={handleSearch} className="navbar-search">
        <Search size={18} color="var(--text-tertiary)" className="navbar-search-icon" />
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm bằng AI..."
          className="input-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <div className="navbar-actions">
        {isAuthenticated && (
          <>
            <Link to="/chat" className="btn-secondary nav-icon-button" aria-label="Chat">
              <MessageCircle size={18} />
            </Link>
            <Link to="/notifications" className="btn-secondary nav-icon-button" aria-label="Notifications">
              <Bell size={18} />
            </Link>
          </>
        )}
        <Link to="/cart" className="btn-secondary nav-icon-button cart-button" aria-label="Cart">
          <ShoppingCart size={20} />
          {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
        </Link>

        {isAuthenticated && user ? (
          <>
            <MenuGroup label="Buyer" links={buyerLinks} />
            {(user.role === 'seller' || user.role === 'admin') && <MenuGroup label="Seller" icon={<Store size={18} />} links={sellerLinks} />}
            {user.role === 'admin' && <MenuGroup label="Admin" icon={<Shield size={18} />} links={adminLinks} />}
            <Link to="/profile" className="btn-secondary navbar-profile">
              <User size={18} />
              <span>{user.full_name}</span>
            </Link>
            <button onClick={handleLogout} className="btn-secondary nav-icon-button logout-button" aria-label="Logout">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <Link to="/login" className="btn-primary">
            Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  );
};
