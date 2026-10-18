import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The login token lives in the phone's encrypted keystore (Android Keystore /
// iOS Keychain), not in plain app storage. The non-secret user summary stays
// in AsyncStorage.
const TOKEN_KEY = 'gp_session_token';
const USER_KEY = 'redline_auth_user';
const LEGACY_KEY = 'redline_auth'; // older builds stored { token, user } together

export async function saveSession(token: string | null, user: unknown) {
  if (token && user) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await AsyncStorage.multiRemove([USER_KEY, LEGACY_KEY]).catch(() => {});
  }
}

export async function loadSession(): Promise<{ token: string; user: any } | null> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const { token, user } = JSON.parse(legacy);
      await AsyncStorage.removeItem(LEGACY_KEY);
      if (token && user) {
        await saveSession(token, user);
        return { token, user };
      }
    }
    const [token, userRaw] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), AsyncStorage.getItem(USER_KEY)]);
    return token && userRaw ? { token, user: JSON.parse(userRaw) } : null;
  } catch {
    return null;
  }
}
