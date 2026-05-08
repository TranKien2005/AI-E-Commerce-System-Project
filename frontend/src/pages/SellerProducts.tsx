import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errors';

interface SellerProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category_id: number | null;
  images: Array<{ id: number; url: string; is_primary: boolean }>;
  created_at: string | null;
}

interface SellerProductsResponse {
  items: SellerProduct[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  category_id: string;
}

const emptyForm: ProductForm = { name: '', description: '', price: '', stock: '', category_id: '' };

export const SellerProducts: React.FC = () => {
  const [items, setItems] = useState<SellerProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrlMap, setImageUrlMap] = useState<Record<number, string>>({});
  const [primaryMap, setPrimaryMap] = useState<Record<number, boolean>>({});
  const [imagePendingId, setImagePendingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKeyword = !normalizedKeyword || item.name.toLowerCase().includes(normalizedKeyword) || item.description.toLowerCase().includes(normalizedKeyword);
      const matchesStock = !stockFilter || (stockFilter === 'in_stock' && item.stock > 0) || (stockFilter === 'out_of_stock' && item.stock === 0) || (stockFilter === 'low_stock' && item.stock > 0 && item.stock <= 5);
      return matchesKeyword && matchesStock;
    });
  }, [items, keyword, stockFilter]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<SellerProductsResponse>('/seller/products') as unknown as SellerProductsResponse;
      setItems(data.items || []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể tải danh sách sản phẩm của shop'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        category_id: form.category_id ? Number(form.category_id) : null,
      };

      if (editingId) {
        await apiClient.put(`/seller/products/${editingId}`, payload);
        setSuccess('Cập nhật sản phẩm thành công');
      } else {
        await apiClient.post('/seller/products', payload);
        setSuccess('Tạo sản phẩm thành công');
      }

      resetForm();
      await loadProducts();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể lưu sản phẩm'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: SellerProduct) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      stock: String(item.stock),
      category_id: item.category_id ? String(item.category_id) : '',
    });
  };

  const handleDelete = async (id: number) => {
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/seller/products/${id}`);
      setSuccess('Đã xóa sản phẩm');
      await loadProducts();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể xóa sản phẩm'));
    }
  };

  const addImage = async (productId: number) => {
    const url = (imageUrlMap[productId] || '').trim();
    if (!url) {
      setError('Vui lòng nhập URL ảnh');
      return;
    }

    setImagePendingId(productId);
    setError('');
    setSuccess('');
    try {
      await apiClient.post(`/seller/products/${productId}/images?url=${encodeURIComponent(url)}&is_primary=${primaryMap[productId] ? 'true' : 'false'}`);
      setImageUrlMap((prev) => ({ ...prev, [productId]: '' }));
      setPrimaryMap((prev) => ({ ...prev, [productId]: false }));
      setSuccess('Đã thêm ảnh sản phẩm');
      await loadProducts();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể thêm ảnh sản phẩm'));
    } finally {
      setImagePendingId(null);
    }
  };

  const deleteImage = async (imageId: number) => {
    setImagePendingId(imageId);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/seller/products/images/${imageId}`);
      setSuccess('Đã xóa ảnh sản phẩm');
      await loadProducts();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Không thể xóa ảnh sản phẩm'));
    } finally {
      setImagePendingId(null);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Quản lý sản phẩm</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Tạo, cập nhật và theo dõi danh mục sản phẩm của shop.</p>
      </header>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><AlertCircle size={18} />{error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><CheckCircle size={18} />{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', gap: '24px', alignItems: 'start' }}>
        <section className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '22px' }}>Danh sách sản phẩm</h2>
            {loading ? <span style={{ color: 'var(--text-secondary)' }}>Đang tải...</span> : <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredItems.length}/{items.length} sản phẩm</span>}
          </div>
          <div className="glass-card" style={{ padding: '14px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: '12px' }}>
            <input className="input-field" placeholder="Tìm theo tên hoặc mô tả" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <select className="input-field" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
              <option value="">Tất cả tồn kho</option>
              <option value="in_stock">Còn hàng</option>
              <option value="low_stock">Sắp hết hàng</option>
              <option value="out_of_stock">Hết hàng</option>
            </select>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredItems.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{item.description || 'Chưa có mô tả'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleEdit(item)}>Sửa</button>
                    <button className="btn-secondary" style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => void handleDelete(item.id)}><Trash2 size={16} />Xóa</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <div><div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Giá</div><div style={{ fontWeight: 700 }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}</div></div>
                  <div><div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Tồn kho</div><div style={{ fontWeight: 700 }}>{item.stock}</div></div>
                  <div><div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Ảnh</div><div style={{ fontWeight: 700 }}>{item.images.length}</div></div>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {item.images.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {item.images.map((image) => (
                        <div key={image.id} className="glass-card" style={{ padding: '8px', width: '120px' }}>
                          <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-secondary)', marginBottom: '8px' }}>
                            <img src={image.url} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ color: image.is_primary ? 'var(--success)' : 'var(--text-tertiary)', fontSize: '11px', marginBottom: '6px' }}>{image.is_primary ? 'Primary' : 'Image'}</div>
                          <button className="btn-secondary" style={{ width: '100%', padding: '6px', color: 'var(--error)' }} disabled={imagePendingId === image.id} onClick={() => void deleteImage(image.id)}>Xóa</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: '8px', alignItems: 'center' }}>
                    <input className="input-field" placeholder="URL ảnh sản phẩm" value={imageUrlMap[item.id] || ''} onChange={(e) => setImageUrlMap((prev) => ({ ...prev, [item.id]: e.target.value }))} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}><input type="checkbox" checked={Boolean(primaryMap[item.id])} onChange={(e) => setPrimaryMap((prev) => ({ ...prev, [item.id]: e.target.checked }))} />Primary</label>
                    <button className="btn-primary" disabled={imagePendingId === item.id} onClick={() => void addImage(item.id)}>Thêm ảnh</button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && items.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chưa có sản phẩm nào trong shop.</p>}
            {!loading && items.length > 0 && filteredItems.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Không có sản phẩm phù hợp bộ lọc.</p>}
          </div>
        </section>

        <aside className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '18px' }}>{editingId ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group"><label className="input-label">Tên sản phẩm</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="input-group"><label className="input-label">Mô tả</label><textarea className="input-field" style={{ minHeight: '100px', resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group"><label className="input-label">Giá</label><input type="number" min="0" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div className="input-group"><label className="input-label">Tồn kho</label><input type="number" min="0" className="input-field" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
            </div>
            <div className="input-group"><label className="input-label">Category ID</label><input type="number" min="0" className="input-field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={18} />{submitting ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button>
              {editingId && <button type="button" className="btn-secondary" onClick={resetForm}><Plus size={18} />Tạo mới</button>}
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
};
