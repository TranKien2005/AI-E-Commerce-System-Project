import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import { getErrorMessage } from '../utils/errors';
import { ShoppingCart, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  primary_image?: string;
  shop_name?: string;
  avg_rating?: number;
}

export const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const query = searchParams.get('q') || '';
  const queryCategoryId = searchParams.get('category_id') || '';
  const queryMinPrice = searchParams.get('min_price') || '';
  const queryMaxPrice = searchParams.get('max_price') || '';
  const querySort = searchParams.get('sort') || '';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCategoryId(queryCategoryId);
      setMinPrice(queryMinPrice);
      setMaxPrice(queryMaxPrice);
      setSort(querySort);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [queryCategoryId, queryMinPrice, queryMaxPrice, querySort]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (queryCategoryId) params.set('category_id', queryCategoryId);
        if (queryMinPrice) params.set('min_price', queryMinPrice);
        if (queryMaxPrice) params.set('max_price', queryMaxPrice);
        if (querySort) params.set('sort', querySort);
        const queryString = params.toString();
        const path = queryString ? `/products?${queryString}` : '/products';
        const data = await apiClient.get<{ items?: Product[] }>(path) as unknown as { items?: Product[] };
        setProducts(data.items || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Không thể tải danh sách sản phẩm'));
      } finally {
        setLoading(false);
      }
    };
    const timeoutId = window.setTimeout(() => {
      void fetchProducts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [query, queryCategoryId, queryMinPrice, queryMaxPrice, querySort]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (categoryId.trim()) params.set('category_id', categoryId.trim());
    if (minPrice.trim()) params.set('min_price', minPrice.trim());
    if (maxPrice.trim()) params.set('max_price', maxPrice.trim());
    if (sort) params.set('sort', sort);
    navigate(`/?${params.toString()}`);
  };

  const clearFilters = () => {
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/');
  };

  const handleAddToCart = async (productId: number, stock: number) => {
    setError('');
    setSuccess('');

    if (stock <= 0) {
      setError('Sản phẩm hiện đã hết hàng');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setPendingProductId(productId);
    try {
      await addToCart(productId, 1);
      setSuccess('Đã thêm sản phẩm vào giỏ hàng');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể thêm sản phẩm vào giỏ hàng'));
    } finally {
      setPendingProductId(null);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px' }}>
        <div style={{ fontSize: '24px', color: 'var(--text-secondary)' }}>Đang tải sản phẩm...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '10px' }}>{query ? `Kết quả tìm kiếm: ${query}` : 'Sản phẩm mới nhất'}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Khám phá những công nghệ tiên tiến nhất được tuyển chọn bởi AI.</p>
      </header>

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

      <form className="glass-card" style={{ padding: '18px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }} onSubmit={applyFilters}>
        <div><label className="input-label">Category ID</label><input className="input-field" type="number" min="1" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} /></div>
        <div><label className="input-label">Giá từ</label><input className="input-field" type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /></div>
        <div><label className="input-label">Giá đến</label><input className="input-field" type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></div>
        <div><label className="input-label">Sắp xếp</label><select className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}><option value="">Mặc định</option><option value="price_asc">Giá tăng</option><option value="price_desc">Giá giảm</option><option value="newest">Mới nhất</option></select></div>
        <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Lọc</button>
        <button type="button" className="btn-secondary" onClick={clearFilters}>Xóa lọc</button>
      </form>

      <div className="grid-products">
        {products.map((product, index) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card"
            style={{ padding: '16px', overflow: 'hidden' }}
          >
            <div style={{ 
              width: '100%', 
              aspectRatio: '1', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--bg-secondary)',
              marginBottom: '16px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {product.primary_image ? (
                <img 
                  src={product.primary_image} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                  No image
                </div>
              )}
              {product.stock === 0 && (
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  background: 'var(--error)', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  Hết hàng
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                {product.shop_name || 'Cửa hàng đối tác'}
              </div>
              <Link to={`/products/${product.id}`}>
                <h3 style={{ fontSize: '18px', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </h3>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#fbbf24' }}>
                  <Star size={14} fill="#fbbf24" />
                  <span style={{ fontSize: '14px', marginLeft: '4px', color: 'var(--text-secondary)' }}>
                    {product.avg_rating || '4.5'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
              </div>
              <button
                className="btn-primary"
                style={{ padding: '8px', justifyContent: 'center', minWidth: '42px', opacity: product.stock === 0 ? 0.6 : 1 }}
                onClick={() => void handleAddToCart(product.id, product.stock)}
                disabled={product.stock === 0 || pendingProductId === product.id}
              >
                {pendingProductId === product.id ? '...' : <ShoppingCart size={18} />}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
