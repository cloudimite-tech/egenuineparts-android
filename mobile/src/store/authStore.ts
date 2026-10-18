import { create } from 'zustand';
import { apiClient } from '../api/client';
import { setAuthToken, setSessionEndedHandler } from '../api/authToken';
import { Address, AuthUser, Profile } from '../types';
import { loadSession, saveSession } from './secureSession';

export interface RegisterInput extends Address {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'BUYER' | 'SELLER';
  acceptTerms: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  profile: Profile | null;
  hydrated: boolean;
  isGuest: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  /** Creates the account and emails a code — sign-in happens after verifyEmail. */
  register: (input: RegisterInput) => Promise<{ email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  acceptTerms: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestEmailChange: (newEmail: string, password: string) => Promise<string>;
  confirmEmailChange: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function persist(token: string | null, user: AuthUser | null) {
  setAuthToken(token);
  await saveSession(token, user).catch(() => {});
}

export const useAuthStore = create<AuthState>((set, get) => {
  const signIn = async (data: { accessToken: string; user: AuthUser }) => {
    await persist(data.accessToken, data.user);
    set({ token: data.accessToken, user: data.user, isGuest: false });
    await get().refreshProfile().catch(() => {});
  };

  // Server says this session was revoked → fall back to guest browsing.
  setSessionEndedHandler(() => {
    if (!get().isGuest) get().logout().catch(() => {});
  });

  return {
    token: null,
    user: null,
    profile: null,
    hydrated: false,
    // Default to guest: like AliExpress/Daraz the app opens straight into the
    // catalog. Sign-in is only asked for when buying, chatting or selling.
    isGuest: true,

    hydrate: async () => {
      const saved = await loadSession();
      if (saved) {
        setAuthToken(saved.token);
        set({ token: saved.token, user: saved.user, isGuest: saved.user?.role === 'GUEST', hydrated: true });
        if (saved.user?.role !== 'GUEST') get().refreshProfile().catch(() => {});
        return;
      }
      set({ hydrated: true });
      get().continueAsGuest().catch(() => {});
    },

    login: async (email, password) => {
      const { data } = await apiClient.post('/auth/login', { email, password });
      await signIn(data);
    },

    register: async (input) => {
      const { data } = await apiClient.post('/auth/register', { ...input, addressLine2: input.addressLine2 || undefined });
      return { email: data.email };
    },

    verifyEmail: async (email, code) => {
      const { data } = await apiClient.post('/auth/verify-email', { email, code });
      await signIn(data);
    },

    resendCode: async (email) => {
      await apiClient.post('/auth/resend-code', { email });
    },

    forgotPassword: async (email) => {
      await apiClient.post('/auth/forgot-password', { email });
    },

    resetPassword: async (email, code, password) => {
      await apiClient.post('/auth/reset-password', { email, code, password });
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
        // Keep the cached user in step (role / seller approval can change).
        const user = get().user;
        const nextUser = user ? { ...user, role: data.role, fullName: data.fullName, sellerStatus: data.sellerStatus } : user;
        if (user && (user.sellerStatus !== data.sellerStatus || user.role !== data.role)) {
          await persist(get().token, nextUser);
        }
        set({ profile: data, user: nextUser });
        return data;
      } catch (e: any) {
        // Token expired, revoked or account gone — fall back to guest browsing.
        if (e?.status === 401) await get().logout();
        return null;
      }
    },

    acceptTerms: async () => {
      await apiClient.post('/users/me/accept-terms');
      await get().refreshProfile();
    },

    deleteAccount: async (password) => {
      await apiClient.post('/users/me/delete', { password });
      await get().logout();
    },

    logoutEverywhere: async () => {
      await apiClient.post('/auth/logout-all');
      await get().logout();
    },

    // These revoke every other device; the server returns a fresh token for this one.
    changePassword: async (currentPassword, newPassword) => {
      const { data } = await apiClient.post('/users/me/password', { currentPassword, newPassword });
      await persist(data.accessToken, get().user);
      set({ token: data.accessToken });
    },

    requestEmailChange: async (newEmail, password) => {
      const { data } = await apiClient.post('/users/me/email', { newEmail, password });
      return data.email as string;
    },

    confirmEmailChange: async (code) => {
      const { data } = await apiClient.post('/users/me/email/confirm', { code });
      const user = get().user ? { ...get().user!, email: data.email } : null;
      await persist(data.accessToken, user);
      set({ token: data.accessToken, user });
      await get().refreshProfile();
    },

    logout: async () => {
      await persist(null, null);
      set({ token: null, user: null, profile: null, isGuest: true });
      get().continueAsGuest().catch(() => {});
    },
  };
});
