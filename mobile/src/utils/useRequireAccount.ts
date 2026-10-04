import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

// Every "buy", "add to cart", "chat", "save" and "sell" action funnels
// through here: guests browse freely, and are asked to sign in only at the
// moment they try something that needs an account.
export function useRequireAccount() {
  const navigation = useNavigation<any>();
  const isGuest = useAuthStore((s) => s.isGuest);
  return useCallback(
    (action: () => void, reason = 'Sign in or create a free account to continue.') => {
      if (!isGuest) {
        action();
        return;
      }
      Alert.alert('Sign in required', reason, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Create account', onPress: () => navigation.navigate('Signup') },
        { text: 'Sign in', onPress: () => navigation.navigate('Welcome') },
      ]);
    },
    [isGuest, navigation],
  );
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.') {
  return (e as any)?.message || fallback;
}
