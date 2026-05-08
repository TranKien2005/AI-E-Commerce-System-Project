import { createContext } from 'react';

export interface CartItem {
  item_id: number;
  product_id: number;
  quantity: number;
  name: string | null;
  price: number | null;
  primary_image: string | null;
  stock: number;
}

export interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  refreshCart: () => Promise<void>;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateCartItem: (itemId: number, quantity: number) => Promise<void>;
  removeCartItem: (itemId: number) => Promise<void>;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);
