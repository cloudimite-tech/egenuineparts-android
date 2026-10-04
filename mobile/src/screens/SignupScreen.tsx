import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  return s;
}
const STRENGTH = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

export function SignupScreen({ route, navigation }: Props) {
  const register = useAuthStore((s) => s.register);
  const [wantsToSell, setWantsToSell] = useState(!!route.params?.sell);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pwScore = strength(password);

  const onCreate = async () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 2) e.fullName = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email.';
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, '');
      const normalized = digits ? (digits.startsWith('0') ? `+94${digits.slice(1)}` : digits.startsWith('94') ? `+${digits}` : `+94${digits}`) : '';
      await register(fullName.trim(), email.trim().toLowerCase(), normalized, password);
      toast.success('Account created');
      if (wantsToSell) {
        navigation.replace('StoreSetup', { mode: 'create' });
      } else {
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main');
      }
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Create your account" subtitle="Save your cars, track orders and ask sellers questions." back />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>I want to</Text>
        <View style={styles.segment}>
          <Choice icon="bag-handle-outline" title="Buy parts" active={!wantsToSell} onPress={() => setWantsToSell(false)} />
          <Choice icon="storefront-outline" title="Buy & sell" active={wantsToSell} onPress={() => setWantsToSell(true)} />
        </View>

        <TextField label="Full name" placeholder="Kasun Perera" value={fullName} onChangeText={setFullName} error={errors.fullName} autoComplete="name" />
        <TextField label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} error={errors.email} autoComplete="email" />
        <TextField label="Mobile number" optional prefix="+94" placeholder="77 123 4567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} hint="Used for delivery updates only. Never shown to sellers in chat." />
        <TextField label="Password" placeholder="At least 8 characters" secureTextEntry value={password} onChangeText={setPassword} error={errors.password} />
        {password ? (
          <View style={{ marginTop: -8, marginBottom: spacing.md }}>
            <View style={styles.meter}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.meterBar, pwScore >= i && { backgroundColor: pwScore >= 3 ? colors.success : pwScore === 2 ? colors.star : colors.accent }]} />
              ))}
            </View>
            <Text style={styles.meterText}>Strength: {STRENGTH[pwScore]}</Text>
          </View>
        ) : null}

        {serverError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        ) : null}

        <Button title={wantsToSell ? 'Create account & set up store' : 'Create account'} onPress={onCreate} loading={loading} />

        <TouchableOpacity style={{ alignItems: 'center', marginTop: spacing.lg }} onPress={() => navigation.replace('Welcome')}>
          <Text style={{ color: colors.textMuted }}>
            Already have an account? <Text style={{ color: colors.accent, fontWeight: '800' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Choice({ icon, title, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.choice, active && styles.choiceActive]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={active ? colors.accent : colors.textMuted} />
      <Text style={[styles.choiceText, active && { color: colors.accent }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  segment: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  choice: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 14, alignItems: 'center', gap: 6 },
  choiceActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  choiceText: { fontWeight: '800', color: colors.textMuted },
  meter: { flexDirection: 'row', gap: 6 },
  meterBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.divider },
  meterText: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: 12, marginBottom: spacing.md },
  errorText: { color: colors.accentDark, fontWeight: '600', flex: 1 },
});
