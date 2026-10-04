import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
interface ToastState {
  message: string | null;
  kind: ToastKind;
  id: number;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: 'info',
  id: 0,
  show: (message, kind = 'info') => set((s) => ({ message, kind, id: s.id + 1 })),
  hide: () => set({ message: null }),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().show(m, 'success'),
  error: (m: string) => useToastStore.getState().show(m, 'error'),
  info: (m: string) => useToastStore.getState().show(m, 'info'),
};
