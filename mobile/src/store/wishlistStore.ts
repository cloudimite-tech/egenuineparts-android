import { create } from 'zustand';
import { apiClient } from '../api/client';

interface WishlistState {
  ids: string[];
  refresh: () => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  refresh: async () => {
    const { data } = await apiClient.get<string[]>('/wishlist/ids');
    set({ ids: data });
  },
  // Optimistic: flip immediately, reconcile with the server's answer.
  toggle: async (productId) => {
    const saved = get().ids.includes(productId);
    set({ ids: saved ? get().ids.filter((i) => i !== productId) : [...get().ids, productId] });
    try {
      const { data } = saved
        ? await apiClient.delete<string[]>(`/wishlist/${productId}`)
        : await apiClient.post<string[]>(`/wishlist/${productId}`);
      set({ ids: data });
    } catch (e) {
      set({ ids: saved ? [...get().ids, productId] : get().ids.filter((i) => i !== productId) });
      throw e;
    }
    return !saved;
  },
  clear: () => set({ ids: [] }),
}));
