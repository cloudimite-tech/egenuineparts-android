import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme, ThemeMode } from '../theme/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'autoguide_theme';

interface ThemeState {
  preference: ThemePreference;
  mode: ThemeMode;
  /** Bumped on every switch - the app root re-renders with this as its key. */
  version: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (p: ThemePreference) => void;
  /** Called when the phone's own light/dark setting changes. */
  systemChanged: () => void;
}

const resolve = (p: ThemePreference): ThemeMode => (p === 'system' ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') : p);

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  mode: 'light',
  version: 0,
  hydrated: false,
  hydrate: async () => {
    let pref: ThemePreference = 'system';
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') pref = raw;
    } catch {
      /* first run */
    }
    const mode = resolve(pref);
    applyTheme(mode);
    set({ preference: pref, mode, hydrated: true, version: get().version + 1 });
  },
  setPreference: (pref) => {
    AsyncStorage.setItem(KEY, pref).catch(() => {});
    const mode = resolve(pref);
    if (mode !== get().mode) applyTheme(mode);
    set({ preference: pref, mode, version: mode !== get().mode ? get().version + 1 : get().version });
  },
  systemChanged: () => {
    const { preference, mode } = get();
    if (preference !== 'system') return;
    const next = resolve('system');
    if (next === mode) return;
    applyTheme(next);
    set({ mode: next, version: get().version + 1 });
  },
}));
