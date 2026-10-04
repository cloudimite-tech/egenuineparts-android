import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Where the API lives, in priority order:
//  1. EXPO_PUBLIC_API_URL (e.g. https://api.genuineparts.lk) — set this for
//     staging/production builds.
//  2. The same machine that's serving the Expo bundle. Expo already knows
//     that host (e.g. 192.168.1.152), and it's reachable from the Android
//     emulator, iOS simulator and a physical phone on the same Wi-Fi alike.
//  3. Emulator/simulator defaults.
function resolveOrigin() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '').replace(/\/api$/, '');

  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;

  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const SERVER_ORIGIN = resolveOrigin();
export const API_BASE_URL = `${SERVER_ORIGIN}/api`;
export const SOCKET_URL = `${SERVER_ORIGIN}/chat`;

// Uploaded photos come back as "/uploads/abc.jpg" — prefix with the server.
export function resolveImageUrl(url?: string | null) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${SERVER_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}
