import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { setAuthToken } from '../api/authToken';
import { AuthUser, Profile } from '../types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  profile: Profile | null;
  hydrated: boolean;
  isGuest: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'redline_auth';

async function persist(token: string | null, user: AuthUser | null) {
  setAuthToken(token);
  if (token && user) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  else await AsyncStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  profile: null,
  hydrated: false,
  // Default to guest: like AliExpress/Daraz the app opens straight into the
  // catalog. Sign-in is only asked for when buying, chatting or selling.
  isGuest: true,

  hydrate: async () => {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable — carry on as a guest
    }
    if (raw) {
      const { token, user } = JSON.parse(raw);
      setAuthToken(token);
      set({ token, user, isGuest: user?.role === 'GUEST', hydrated: true });
      if (user?.role !== 'GUEST') get().refreshProfile().catch(() => {});
      return;
    }
    set({ hydrated: true });
    get().continueAsGuest().catch(() => {});
  },

  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    await persist(data.accessToken, data.user);
    set({ token: data.accessToken, user: data.user, isGuest: false });
    await get().refreshProfile().catch(() => {});
  },

  register: async (fullName, email, phone, password) => {
    const { data } = await apiClient.post('/auth/register', {
      fullName,
      email,
      phone: phone || undefined,
      password,
    });
    await persist(data.accessToken, data.user);
    set({ token: data.accessToken, user: data.user, isGuest: false });
    await get().refreshProfile().catch(() => {});
  },

  continueAsGuest: async () => {
    const { data } = await apiClient.post('/auth/guest');
    await persist(data.accessToken, data.user);
    set({ token: data.accessToken, user: data.user, isGuest: true, profile: null });
  },

  refreshProfile: async () => {
    if (get().isGuest) return null;
    try {
      const { data } = await apiClient.get<Profile>('/users/me');
      set({ profile: data });
      return data;
    } catch (e: any) {
      // Token expired or account gone — fall back to guest browsing.
      if (/unauthori[sz]ed|401/i.test(e.message)) await get().logout();
      return null;
    }
  },

  logout: async () => {
    await persist(null, null);
    set({ token: null, user: null, profile: null, isGuest: true });
    get().continueAsGuest().catch(() => {});
  },
}));
