import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { Store } from '../../types';
import { Header } from '../../components/Header';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { errorMessage, useRequireAccount } from '../../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'StoreSetup'>;

export function StoreSetupScreen({ route, navigation }: Props) {
  const mode = route.params?.mode ?? 'create';
  const insets = useSafeAreaInsets();
  const isGuest = useAuthStore((s) => s.isGuest);
  const requireAccount = useRequireAccount();
  const [loading, setLoading] = useState(mode === 'edit');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [shipsFrom, setShipsFrom] = useState('');
  const [returnsPolicy, setReturnsPolicy] = useState('7 days, unused parts');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isGuest) {
      requireAccount(() => {}, 'Create an account to open your store.');
      return;
    }
    if (mode !== 'edit') return;
    apiClient
      .get<Store>('/stores/me')
      .then(({ data }) => {
        setName(data.name);
        setBio(data.bio ?? '');
        setShipsFrom(data.shipsFrom ?? '');
        setReturnsPolicy(data.returnsPolicy ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mode, isGuest]);

  const save = async () => {
    if (name.trim().length < 2) {
      setError('Give your store a name.');
      return;
    }
    setError(null);
    setSaving(true);
    const body = {
      name: name.trim(),
      bio: bio.trim() || undefined,
      shipsFrom: shipsFrom.trim() || undefined,
      returnsPolicy: returnsPolicy.trim() || undefined,
    };
    try {
      if (mode === 'edit') {
        await apiClient.patch('/stores/me', body);
        toast.success('Store updated');
        navigation.goBack();
      } else {
        await apiClient.post('/stores', body);
        await useAuthStore.getState().refreshProfile();
        toast.success('Your store is open!');
        navigation.replace('SellerDashboard');
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={mode === 'edit' ? 'Store settings' : 'Open your store'} back />
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {mode === 'create' ? (
            <View style={styles.intro}>
              <Ionicons name="storefront" size={30} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.introTitle}>Sell to buyers island-wide</Text>
                <Text style={styles.introText}>Free to open. You list parts, buyers pay cash on delivery, and every buyer chat stays in the app.</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.card}>
            <TextField label="Store name" placeholder="e.g. Colombo Auto Hub" value={name} onChangeText={setName} />
            <TextField
              label="About your store"
              optional
              multiline
              placeholder="What you specialise in — e.g. genuine Toyota & Honda parts since 2019."
              value={bio}
              onChangeText={setBio}
              maxLength={300}
            />
            <TextField label="Ships from" placeholder="Colombo 10" icon="location-outline" value={shipsFrom} onChangeText={setShipsFrom} />
            <TextField label="Returns policy" placeholder="7 days, unused parts" icon="return-down-back-outline" value={returnsPolicy} onChangeText={setReturnsPolicy} />
          </View>
          <View style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
            <Text style={styles.noteText}>
              Don't add phone numbers, emails or social links to your store — buyers contact you through Genuine Parts.lk chat, and delivery details arrive with each order.
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <Button title={mode === 'edit' ? 'Save changes' : 'Open my store'} onPress={save} loading={saving} disabled={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', gap: 14, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4, alignItems: 'center' },
  introTitle: { fontWeight: '900', fontSize: 17 },
  introText: { color: colors.textMuted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, paddingBottom: 0 },
  note: { flexDirection: 'row', gap: 10, backgroundColor: colors.infoSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm + 4 },
  noteText: { flex: 1, color: '#1E3A8A', fontSize: 12, lineHeight: 18 },
  error: { color: colors.accent, fontWeight: '700', marginTop: spacing.md },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, padding: spacing.md, paddingTop: spacing.sm + 2, borderTopWidth: 1, borderTopColor: colors.border },
});
