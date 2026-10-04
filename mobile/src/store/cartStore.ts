import { create } from 'zustand';
import { apiClient } from '../api/client';
import { CartResponse } from '../types';

interface CartState {
  cart: CartResponse | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<CartResponse>;
  setQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get<CartResponse>('/cart');
      set({ cart: data });
    } finally {
      set({ loading: false });
    }
  },
  addItem: async (productId, quantity = 1) => {
    const { data } = await apiClient.post<CartResponse>('/cart/items', { productId, quantity });
    set({ cart: data });
    return data;
  },
  setQuantity: async (itemId, quantity) => {
    const { data } = await apiClient.patch<CartResponse>(`/cart/items/${itemId}`, { quantity });
    set({ cart: data });
  },
  removeItem: async (itemId) => {
    const { data } = await apiClient.delete<CartResponse>(`/cart/items/${itemId}`);
    set({ cart: data });
  },
  clear: () => set({ cart: null }),
}));

export const selectCartCount = (s: CartState) =>
  s.cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
