import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { GradientHeader } from '../../components/GradientHeader';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { MyApplication, SellerStatus } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerGate'>;

const COPY: Record<Exclude<SellerStatus, 'APPROVED'>, { icon: keyof typeof Ionicons.glyphMap; tone: string; bg: string; title: string; text: string }> = {
  NOT_SUBMITTED: {
    icon: 'document-text-outline', tone: colors.navy, bg: colors.navySoft,
    title: 'Complete your seller application',
    text: 'Tell us about your business and add your NIC, Business Registration (BR) certificate, shop location and a selfie at your shop. Our team verifies every seller before their store goes live.',
  },
  PENDING: {
    icon: 'time-outline', tone: colors.warning, bg: colors.warningSoft,
    title: 'Your application is under review',
    text: 'Our team is checking your business details. This usually takes 1–2 working days — this screen updates by itself once you’re approved.',
  },
  REJECTED: {
    icon: 'alert-circle-outline', tone: colors.accent, bg: colors.accentSoft,
    title: 'Your application needs changes',
    text: 'Please update your details using the note from our team below, then resubmit.',
  },
  SUSPENDED: {
    icon: 'ban-outline', tone: colors.accent, bg: colors.accentSoft,
    title: 'Your store is suspended',
    text: 'Your listings are hidden from buyers. Contact support@genuineparts.lk to resolve this.',
  },
};

// Seller accounts land here until an admin approves them. Once approved,
// the navigator swaps this for the full app automatically.
export function SellerGateScreen({ navigation }: Props) {
  const { profile, user, refreshProfile, logout } = useAuthStore();
  const isBuyer = (profile?.role ?? user?.role) !== 'SELLER';
  const status = (profile?.sellerStatus ?? profile?.store?.status ?? user?.sellerStatus ?? 'NOT_SUBMITTED') as Exclude<SellerStatus, 'APPROVED'>;
  const [app, setApp] = useState<MyApplication | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await refreshProfile().catch(() => {});
    const { data } = await apiClient.get<MyApplication>('/seller-application').catch(() => ({ data: null as any }));
    if (data) setApp(data);
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // While pending, check every 30 s and whenever the app comes back to the foreground.
  useEffect(() => {
    if (status !== 'PENDING') return;
    const timer = setInterval(() => refreshProfile().catch(() => {}), 30000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshProfile().catch(() => {}));
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [status, refreshProfile]);

  const c = COPY[status] ?? COPY.NOT_SUBMITTED;
  const submittedAt = app?.submittedAt ? new Date(app.submittedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
  const note = app?.reviewNote ?? profile?.store?.reviewNote;

  const confirmLogout = () =>
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);

  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: isBuyer ? 'Signed in' : 'Seller account created', done: true, active: false },
    { label: 'NIC, BR certificate, location & selfie', done: status !== 'NOT_SUBMITTED' && status !== 'REJECTED', active: status === 'NOT_SUBMITTED' || status === 'REJECTED' },
    { label: 'Verified by Genuine Parts.lk', done: false, active: status === 'PENDING' },
    { label: 'Start selling', done: false, active: false },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <GradientHeader style={styles.hero}>
        <Logo height={30} onDark />
        <Text style={styles.heroTitle}>Seller Centre</Text>
        <Text style={styles.heroSub}>{profile?.fullName ?? user?.fullName} · {profile?.email ?? user?.email}</Text>
      </GradientHeader>

      <View style={[styles.statusCard, { backgroundColor: c.bg }]}>
        <Ionicons name={c.icon} size={34} color={c.tone} />
        <Text style={[styles.statusTitle, { color: c.tone }]}>{c.title}</Text>
        <Text style={styles.statusText}>{c.text}</Text>
        {status === 'PENDING' && submittedAt ? <Text style={styles.meta}>Submitted {submittedAt}</Text> : null}
        {note && (status === 'REJECTED' || status === 'SUSPENDED') ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>NOTE FROM OUR TEAM</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        {steps.map((s, i) => (
          <View key={s.label} style={styles.step}>
            <View style={[styles.dot, s.done && { backgroundColor: colors.success, borderColor: colors.success }, s.active && { borderColor: colors.accent }]}>
              {s.done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : <Text style={[styles.dotNum, s.active && { color: colors.accent }]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepText, s.done && { color: colors.text }, s.active && { color: colors.accent, fontWeight: '800' }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {app?.application && status !== 'NOT_SUBMITTED' ? (
        <View style={styles.card}>
          <Row label="Store" value={app.application.storeName} />
          <Row label="Business" value={app.application.businessName} />
          <Row label="BR number" value={app.application.brNumber} />
          <Row label="NIC" value={app.application.nicNumber ? `••••${app.application.nicNumber.slice(-4)}` : null} />
          <Row label="Location" value={[app.application.city, app.application.district].filter(Boolean).join(', ')} />
          <Row label="Documents" value={[app.application.document && 'BR', app.application.nicFront && 'NIC', app.application.selfie && 'Selfie'].filter(Boolean).join(' · ') || '—'} />
          <Row label="Map pin" value={app.application.latitude != null ? 'Set' : 'Missing'} last />
        </View>
      ) : null}

      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.md }}>
        {status === 'NOT_SUBMITTED' ? <Button title="Start application" icon="arrow-forward" onPress={() => navigation.navigate('SellerApplication')} /> : null}
        {status === 'REJECTED' ? <Button title="Update & resubmit" icon="create-outline" onPress={() => navigation.navigate('SellerApplication')} /> : null}
        {status === 'PENDING' ? <Button title="Edit application" variant="outline" icon="create-outline" onPress={() => navigation.navigate('SellerApplication')} /> : null}
        {isBuyer ? (
          <Button title="Back to shopping" variant="ghost" icon="arrow-back" onPress={() => navigation.goBack()} />
        ) : (
          <Button title="Sign out" variant="ghost" icon="log-out-outline" onPress={confirmLogout} />
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: HEADER_TOP + 8, padding: spacing.lg, borderBottomWidth: 3, borderBottomColor: colors.accent },
  heroTitle: { color: colors.white, fontSize: 26, fontWeight: '900', marginTop: spacing.md },
  heroSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statusCard: { margin: spacing.md, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', gap: 8 },
  statusTitle: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
  statusText: { color: colors.text, textAlign: 'center', lineHeight: 21 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  noteBox: { alignSelf: 'stretch', backgroundColor: colors.white, borderRadius: radius.sm, padding: 12, marginTop: 8 },
  noteLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.8 },
  noteText: { color: colors.text, marginTop: 4, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dotNum: { fontSize: 12, fontWeight: '800', color: colors.textFaint },
  stepText: { color: colors.textMuted, fontSize: 15, flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, gap: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { color: colors.textMuted },
  rowValue: { color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
