import React, { useEffect, useState } from 'react';
import { leaveAuth } from '../navigation/leaveAuth';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, themed } from '../theme/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { verifyEmail, resendCode } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(email, value);
      toast.success('Email verified - welcome to AutoGuide!');
      // Seller accounts switch to the seller application automatically.
      leaveAuth(navigation, 'top');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await resendCode(email);
      setCooldown(60);
      toast.success('New code sent');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Verify your email" back />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}>
          <Ionicons name="mail-unread-outline" size={36} color={colors.link} />
        </View>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.text}>
          We sent a 6-digit code to <Text style={{ fontWeight: '800', color: colors.text }}>{email}</Text>. It expires in 10 minutes. Check your spam folder if you can’t see it.
        </Text>
        <TextField
          label="Verification code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          value={code}
          onChangeText={(t) => {
            const v = t.replace(/\D/g, '').slice(0, 6);
            setCode(v);
            if (v.length === 6) verify(v);
          }}
          error={error}
          style={{ fontSize: 22, letterSpacing: 6, fontWeight: '800' }}
        />
        <Button title="Verify email" onPress={() => verify()} loading={loading} />
        <TouchableOpacity style={{ alignItems: 'center', marginTop: spacing.lg }} onPress={resend} disabled={cooldown > 0}>
          <Text style={{ color: cooldown > 0 ? colors.textFaint : colors.accent, fontWeight: '800' }}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
        <View style={styles.wrong}>
          <Text style={styles.wrongText}>Wrong email address?</Text>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => {
              // Back to the filled-in sign-up form if we came from it, otherwise a fresh one.
              const routes = navigation.getState()?.routes ?? [];
              const prev = routes[routes.length - 2];
              if (prev?.name === 'Signup') navigation.goBack();
              else navigation.navigate('Signup');
            }}
          >
            <Text style={styles.wrongLink}>Fix it and sign up again</Text>
          </TouchableOpacity>
          <Text style={styles.wrongHint}>Your details aren’t kept until the email is verified, so you can use the same mobile number.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: spacing.lg, lineHeight: 21 },
  wrong: { alignItems: 'center', marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider },
  wrongText: { color: colors.textMuted, fontSize: 13.5 },
  wrongLink: { color: colors.accent, fontWeight: '800', marginTop: 4, fontSize: 14.5 },
  wrongHint: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
}));
