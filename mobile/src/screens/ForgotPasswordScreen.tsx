import React, { useState } from 'react';
import { leaveAuth } from '../navigation/leaveAuth';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ route, navigation }: Props) {
  const { forgotPassword, resetPassword, login } = useAuthStore();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email.');
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStep('reset');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the email.');
    if (password.length < 8) return setError('Use at least 8 characters for your new password.');
    setError(null);
    setLoading(true);
    try {
      const e = email.trim().toLowerCase();
      await resetPassword(e, code, password);
      await login(e, password).catch(() => {});
      toast.success('Password changed');
      leaveAuth(navigation, 'top');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Reset your password" back />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {step === 'email' ? (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 21 }}>
              Enter the email you signed up with and we’ll send you a 6-digit code.
            </Text>
            <TextField label="Email" icon="mail-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} error={error} />
            <Button title="Send code" onPress={send} loading={loading} />
          </>
        ) : (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 21 }}>
              If an account exists for <Text style={{ fontWeight: '800', color: colors.text }}>{email}</Text>, we’ve emailed a code. It expires in 10 minutes.
            </Text>
            <TextField label="Code" keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} />
            <TextField label="New password" placeholder="At least 8 characters" secureTextEntry value={password} onChangeText={setPassword} error={error} />
            <Button title="Change password" onPress={reset} loading={loading} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.md, textAlign: 'center' }}>
              Changing your password signs you out on all other devices.
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
