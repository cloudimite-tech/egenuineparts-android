import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../theme/theme';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'));

  const onSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back!');
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.headerBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Logo height={34} onDark tagline="SRI LANKA’S AUTO PARTS MARKETPLACE" />
            <TouchableOpacity style={styles.guestPill} onPress={close}>
              <Text style={styles.guestPillText}>Keep browsing</Text>
              <Ionicons name="close" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.carWrap}>
            <View style={styles.speedLines}>
              {[46, 30, 38].map((w, i) => (
                <View key={i} style={[styles.speedLine, { width: w }]} />
              ))}
            </View>
            <Ionicons name="car-sport" size={110} color="#4A49A8" />
          </View>
          <View style={styles.badges}>
            {['Verified sellers', 'Fitment checked', 'Island-wide delivery'].map((b) => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to buy, chat with sellers and track orders.</Text>
          <TextField label="Email" icon="mail-outline" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
          <TextField label="Password" icon="lock-closed-outline" placeholder="Your password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={onSignIn} />
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Button title="Sign in" onPress={onSignIn} loading={loading} />
          <TouchableOpacity style={styles.footer} onPress={() => navigation.replace('Signup')}>
            <Text style={styles.footerText}>
              New to Genuine Parts.lk? <Text style={styles.footerLink}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: HEADER_TOP + 8, paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  guestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  guestPillText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  carWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  speedLines: { gap: 8, marginRight: -6 },
  speedLine: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  badge: { backgroundColor: colors.headerElevated, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#D4D4D8', fontSize: 12, fontWeight: '600' },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    borderTopWidth: 3,
    borderTopColor: colors.accent,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: 12, marginBottom: spacing.md },
  errorText: { color: colors.accentDark, fontWeight: '600', flex: 1 },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted },
  footerLink: { color: colors.accent, fontWeight: '800' },
});
