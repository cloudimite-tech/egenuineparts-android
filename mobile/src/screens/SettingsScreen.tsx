import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, themed } from '../theme/theme';
import { Header } from '../components/Header';
import { useAuthStore } from '../store/authStore';
import { openPrivacy, openTerms } from '../components/TermsGate';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { profile, logoutEverywhere } = useAuthStore();

  const confirmLogoutAll = () =>
    Alert.alert('Sign out of all devices?', 'You’ll be signed out everywhere, including this phone. Use this if you think someone else has your password.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out everywhere', style: 'destructive', onPress: () => logoutEverywhere().catch(() => {}) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Settings & security" back />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.section}>ACCOUNT</Text>
        <View style={styles.menu}>
          <Row icon="person-circle-outline" label="My details & address" detail={profile?.city ?? undefined} onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="mail-outline" label="Email" detail={profile?.email} onPress={() => navigation.navigate('ChangeEmail')} />
          <Row icon="key-outline" label="Change password" onPress={() => navigation.navigate('ChangePassword')} last />
        </View>

        <Text style={styles.section}>PRIVACY & SAFETY</Text>
        <View style={styles.menu}>
          <Row icon="hand-left-outline" label="Blocked users" onPress={() => navigation.navigate('BlockedUsers')} />
          <Row icon="phone-portrait-outline" label="Sign out of all devices" onPress={confirmLogoutAll} last />
        </View>

        <Text style={styles.section}>ABOUT</Text>
        <View style={styles.menu}>
          <Row icon="document-text-outline" label="Terms of Use" onPress={openTerms} />
          <Row icon="lock-closed-outline" label="Privacy Policy" onPress={openPrivacy} last />
        </View>

        <View style={styles.menu}>
          <Row icon="trash-outline" label="Delete account" danger onPress={() => navigation.navigate('DeleteAccount')} last />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, detail, onPress, last, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; onPress: () => void; last?: boolean; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.border]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? colors.accent : colors.text} />
      <Text style={[styles.label, danger && { color: colors.accent }]}>{label}</Text>
      {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : <View style={{ flex: 1 }} />}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, color: colors.textMuted, marginHorizontal: spacing.md + 4, marginTop: spacing.lg, marginBottom: 6 },
  menu: { backgroundColor: colors.surface, borderRadius: radius.md, marginHorizontal: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  detail: { flex: 1, textAlign: 'right', color: colors.textMuted, fontSize: 13 },
}));
