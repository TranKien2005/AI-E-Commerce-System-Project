import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './useAuth';
import { CartContext, type CartItem } from './CartContextValue';

interface CartResponse {
  items: CartItem[];
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.get<CartResponse>('/cart') as unknown as CartResponse;
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);


  const addToCart = useCallback(async (productId: number, quantity = 1) => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    await apiClient.post('/cart/items', { product_id: productId, quantity });
    await refreshCart();
  }, [isAuthenticated, refreshCart]);

  const updateCartItem = useCallback(async (itemId: number, quantity: number) => {
    await apiClient.put(`/cart/items/${itemId}`, { quantity });
    await refreshCart();
  }, [refreshCart]);

  const removeCartItem = useCallback(async (itemId: number) => {
    await apiClient.delete(`/cart/items/${itemId}`);
    await refreshCart();
  }, [refreshCart]);

  if (!isAuthenticated && items.length > 0) {
    queueMicrotask(() => setItems([]));
  }

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0), [items]);

  return (
    <CartContext.Provider value={{ items, loading, itemCount, subtotal, refreshCart, addToCart, updateCartItem, removeCartItem }}>
      {children}
    </CartContext.Provider>
  );
};
