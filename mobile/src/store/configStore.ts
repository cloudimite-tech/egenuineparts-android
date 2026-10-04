import { create } from 'zustand';
import { apiClient } from '../api/client';

// Server-side app settings (currently the USD → LKR rate used to settle
// USD-priced parts in cash-on-delivery totals).
interface ConfigState {
  usdToLkr: number;
  load: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  usdToLkr: 300,
  load: async () => {
    try {
      const { data } = await apiClient.get<{ usdToLkr: number }>('/config');
      if (data?.usdToLkr) set({ usdToLkr: data.usdToLkr });
    } catch {}
  },
}));

export function toLkr(amount: string | number, currency?: string | null, rate = useConfigStore.getState().usdToLkr) {
  return Number(amount) * (currency === 'USD' ? rate : 1);
}
