import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAuthToken } from './authToken';

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error?.response?.data?.message ??
      (Array.isArray(error?.response?.data?.message) ? error.response.data.message[0] : null) ??
      error.message ??
      'Something went wrong.';
    return Promise.reject(new Error(Array.isArray(message) ? message[0] : message));
  },
);
