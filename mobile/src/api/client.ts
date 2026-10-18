import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAuthToken, sessionEnded } from './authToken';

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiError extends Error {
  status?: number;
  code?: string;
  data?: any;
}

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error?.response?.data;
    const raw = data?.message ?? error.message ?? 'Something went wrong.';
    const err: ApiError = new Error(Array.isArray(raw) ? raw[0] : raw);
    err.status = error?.response?.status;
    err.code = data?.code;
    err.data = data;
    // Signed out elsewhere (password reset, ban, "sign out everywhere").
    if (err.status === 401 && err.code === 'SESSION_REVOKED') sessionEnded();
    return Promise.reject(err);
  },
);
