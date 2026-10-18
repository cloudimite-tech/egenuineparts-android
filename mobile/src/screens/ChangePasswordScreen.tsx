import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../components/Themed';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props) {
  const { changePassword, profile } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!current) return setError('Enter your current password.');
    if (next.length < 8) return setError('Use at least 8 characters for your new password.');
    if (next !== repeat) return setError('The new passwords don’t match.');
    setError(null);
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.success('Password changed');
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Change password" back />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <TextField label="Current password" secureTextEntry autoComplete="password" value={current} onChangeText={setCurrent} />
        <TextField label="New password" placeholder="At least 8 characters" secureTextEntry autoComplete="password-new" value={next} onChangeText={setNext} />
        <TextField label="Repeat new password" secureTextEntry autoComplete="password-new" value={repeat} onChangeText={setRepeat} error={error} />
        <Button title="Change password" onPress={save} loading={loading} />
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.md, textAlign: 'center' }}>
          You’ll stay signed in here; other devices will be signed out.
        </Text>
        <TouchableOpacity style={{ alignItems: 'center', marginTop: spacing.lg }} onPress={() => navigation.navigate('ForgotPassword', { email: profile?.email })}>
          <Text style={{ color: colors.link, fontWeight: '700' }}>Forgot your current password?</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
