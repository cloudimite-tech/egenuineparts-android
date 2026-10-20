import { create } from 'zustand';
import { apiClient } from '../api/client';

// Server-side app settings (currently the USD → LKR rate used to settle
// USD-priced parts in cash-on-delivery totals).
interface ConfigState {
  usdToLkr: number;
  // Live chat over WebSocket. Off on Vercel (no WebSocket support) - the app
  // then sends over REST and polls gently instead. Off until the server says so.
  realtime: boolean;
  load: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  usdToLkr: 300,
  realtime: false,
  load: async () => {
    try {
      const { data } = await apiClient.get<{ usdToLkr: number; realtime?: boolean }>('/config');
      if (data?.usdToLkr) set({ usdToLkr: data.usdToLkr });
      set({ realtime: data?.realtime === true });
    } catch {}
  },
}));

export function toLkr(amount: string | number, currency?: string | null, rate = useConfigStore.getState().usdToLkr) {
  return Number(amount) * (currency === 'USD' ? rate : 1);
}
