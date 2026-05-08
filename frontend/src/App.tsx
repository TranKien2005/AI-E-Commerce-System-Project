import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then((module) => ({ default: module.ProductDetail })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })));
const Cart = lazy(() => import('./pages/Cart').then((module) => ({ default: module.Cart })));
const Orders = lazy(() => import('./pages/Orders').then((module) => ({ default: module.Orders })));
const OrderDetail = lazy(() => import('./pages/OrderDetail').then((module) => ({ default: module.OrderDetail })));
const Notifications = lazy(() => import('./pages/Notifications').then((module) => ({ default: module.Notifications })));
const BuyerSellerRequest = lazy(() => import('./pages/BuyerSellerRequest').then((module) => ({ default: module.BuyerSellerRequest })));
const BuyerReviews = lazy(() => import('./pages/BuyerReviews').then((module) => ({ default: module.BuyerReviews })));
const BuyerReports = lazy(() => import('./pages/BuyerReports').then((module) => ({ default: module.BuyerReports })));
const ChatList = lazy(() => import('./pages/ChatList').then((module) => ({ default: module.ChatList })));
const ChatDetail = lazy(() => import('./pages/ChatDetail').then((module) => ({ default: module.ChatDetail })));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard').then((module) => ({ default: module.SellerDashboard })));
const SellerProducts = lazy(() => import('./pages/SellerProducts').then((module) => ({ default: module.SellerProducts })));
const SellerOrders = lazy(() => import('./pages/SellerOrders').then((module) => ({ default: module.SellerOrders })));
const SellerOrderDetail = lazy(() => import('./pages/SellerOrderDetail').then((module) => ({ default: module.SellerOrderDetail })));
const SellerShop = lazy(() => import('./pages/SellerShop').then((module) => ({ default: module.SellerShop })));
const SellerChatbot = lazy(() => import('./pages/SellerChatbot').then((module) => ({ default: module.SellerChatbot })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const AdminSellerRequests = lazy(() => import('./pages/AdminSellerRequests').then((module) => ({ default: module.AdminSellerRequests })));
const AdminReports = lazy(() => import('./pages/AdminReports').then((module) => ({ default: module.AdminReports })));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs').then((module) => ({ default: module.AdminAuditLogs })));
const AdminMetrics = lazy(() => import('./pages/AdminMetrics').then((module) => ({ default: module.AdminMetrics })));
const AdminLogs = lazy(() => import('./pages/AdminLogs').then((module) => ({ default: module.AdminLogs })));

const PageLoader: React.FC = () => (
  <div className="container" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
    Đang tải trang...
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, paddingTop: '20px' }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/seller-request" element={<BuyerSellerRequest />} />
                    <Route path="/reviews/new" element={<BuyerReviews />} />
                    <Route path="/reports/new" element={<BuyerReports />} />
                    <Route path="/chat" element={<ChatList />} />
                    <Route path="/chat/:id" element={<ChatDetail />} />
                  </Route>
                  <Route element={<RoleRoute allowedRoles={["seller", "admin"]} />}>
                    <Route path="/seller" element={<SellerDashboard />} />
                    <Route path="/seller/shop" element={<SellerShop />} />
                    <Route path="/seller/products" element={<SellerProducts />} />
                    <Route path="/seller/orders" element={<SellerOrders />} />
                    <Route path="/seller/orders/:id" element={<SellerOrderDetail />} />
                    <Route path="/seller/chatbot" element={<SellerChatbot />} />
                  </Route>
                  <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/seller-requests" element={<AdminSellerRequests />} />
                    <Route path="/admin/reports" element={<AdminReports />} />
                    <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                    <Route path="/admin/metrics" element={<AdminMetrics />} />
                    <Route path="/admin/logs" element={<AdminLogs />} />
                  </Route>
                  <Route path="*" element={<div className="container"><h1>404 Not Found</h1></div>} />
                </Routes>
              </Suspense>
            </main>
            <footer style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              &copy; 2026 AI-ECOMMERCE. All rights reserved. Built for the future.
            </footer>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
