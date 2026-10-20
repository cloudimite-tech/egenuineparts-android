import React, { useState } from 'react';
import { goBackOr } from '../navigation/goBackOr';
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

type Props = NativeStackScreenProps<RootStackParamList, 'ChangeEmail'>;

export function ChangeEmailScreen({ navigation }: Props) {
  const { profile, requestEmailChange, confirmEmailChange } = useAuthStore();
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email.');
    if (!password) return setError('Enter your password.');
    setError(null);
    setLoading(true);
    try {
      setSentTo(await requestEmailChange(email.trim().toLowerCase(), password));
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the email.');
    setError(null);
    setLoading(true);
    try {
      await confirmEmailChange(code);
      toast.success('Email changed');
      goBackOr(navigation);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Change email" back />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {step === 'details' ? (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 21 }}>
              Your current email is <Text style={{ fontWeight: '800', color: colors.text }}>{profile?.email}</Text>. We’ll send a code to the new address to confirm it.
            </Text>
            <TextField label="New email" icon="mail-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
            <TextField label="Your password" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} error={error} />
            <Button title="Send code" onPress={request} loading={loading} />
          </>
        ) : (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 21 }}>
              Enter the 6-digit code we sent to <Text style={{ fontWeight: '800', color: colors.text }}>{sentTo}</Text>. It expires in 10 minutes.
            </Text>
            <TextField label="Code" keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} error={error} />
            <Button title="Confirm new email" onPress={confirm} loading={loading} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.md, textAlign: 'center' }}>
              Other devices will be signed out, and we’ll let your old address know.
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
