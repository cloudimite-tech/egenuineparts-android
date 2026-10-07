import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { DistrictSelect } from '../components/DistrictSelect';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';
import { isValidSlPhone, normalizePhone } from '../utils/phone';

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
  const [isSeller, setIsSeller] = useState(!!route.params?.sell);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pwScore = strength(password);

  const onCreate = async () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 2) e.fullName = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email.';
    if (!isValidSlPhone(phone)) e.phone = 'Enter a valid Sri Lankan mobile number.';
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    if (addressLine1.trim().length < 3) e.addressLine1 = 'Enter your house number and street.';
    if (city.trim().length < 2) e.city = 'Enter your city.';
    if (!district) e.district = 'Choose your district.';
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizePhone(phone),
        password,
        role: isSeller ? 'SELLER' : 'BUYER',
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        district,
      });
      if (isSeller) {
        // The app switches to the seller application screens by itself.
        toast.success('Account created — now tell us about your business');
      } else {
        toast.success('Account created');
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
          <Choice icon="bag-handle-outline" title="Buy parts" sub="Shop & order" active={!isSeller} onPress={() => setIsSeller(false)} />
          <Choice icon="storefront-outline" title="Sell parts" sub="Open a store" active={isSeller} onPress={() => setIsSeller(true)} />
        </View>
        {isSeller ? (
          <View style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.navy} />
            <Text style={styles.noteText}>
              Seller accounts are verified. After sign-up you’ll add your NIC, Business Registration (BR) certificate, shop location and a selfie at your shop, and our team will approve your store.
            </Text>
          </View>
        ) : null}

        <Text style={styles.section}>Your details</Text>
        <TextField label="Full name" placeholder="Kasun Perera" value={fullName} onChangeText={setFullName} error={errors.fullName} autoComplete="name" />
        <TextField label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} error={errors.email} autoComplete="email" />
        <TextField label="Mobile number" prefix="+94" placeholder="77 123 4567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={errors.phone} hint="For delivery updates. Never shown to other users in chat." />
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

        <Text style={styles.section}>{isSeller ? 'Your address' : 'Delivery address'}</Text>
        <TextField label="Address" placeholder="House no. and street" value={addressLine1} onChangeText={setAddressLine1} error={errors.addressLine1} autoComplete="street-address" />
        <TextField label="Apartment, lane or landmark" optional placeholder="Near the temple, 2nd lane…" value={addressLine2} onChangeText={setAddressLine2} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField label="City" placeholder="Nugegoda" value={city} onChangeText={setCity} error={errors.city} />
          </View>
          <View style={{ flex: 1 }}>
            <DistrictSelect value={district} onChange={setDistrict} error={errors.district} />
          </View>
        </View>

        {serverError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        ) : null}

        <Button title={isSeller ? 'Create seller account' : 'Create account'} onPress={onCreate} loading={loading} />

        <TouchableOpacity style={{ alignItems: 'center', marginTop: spacing.lg }} onPress={() => navigation.replace('Welcome')}>
          <Text style={{ color: colors.textMuted }}>
            Already have an account? <Text style={{ color: colors.accent, fontWeight: '800' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Choice({ icon, title, sub, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.choice, active && styles.choiceActive]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={active ? colors.accent : colors.textMuted} />
      <Text style={[styles.choiceText, active && { color: colors.accent }]}>{title}</Text>
      <Text style={styles.choiceSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  section: { fontSize: 12, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.xs },
  segment: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  choice: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 14, alignItems: 'center', gap: 4 },
  choiceActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  choiceText: { fontWeight: '800', color: colors.textMuted },
  choiceSub: { fontSize: 11, color: colors.textFaint },
  note: { flexDirection: 'row', gap: 10, backgroundColor: colors.navySoft, borderRadius: radius.sm, padding: 12, marginBottom: spacing.md },
  noteText: { flex: 1, color: colors.navyDark, fontSize: 13, lineHeight: 18 },
  meter: { flexDirection: 'row', gap: 6 },
  meterBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.divider },
  meterText: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: 12, marginBottom: spacing.md },
  errorText: { color: colors.accentDark, fontWeight: '600', flex: 1 },
});
