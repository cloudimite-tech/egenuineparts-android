import React, { useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, themed } from '../theme/theme';
import { SERVER_ORIGIN } from '../api/config';
import { Button } from './Button';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

export const openTerms = () => Linking.openURL(`${SERVER_ORIGIN}/terms`);
export const openPrivacy = () => Linking.openURL(`${SERVER_ORIGIN}/privacy`);

// Accounts created before the Terms of Use existed are asked to accept them
// once (Google Play requires it before using chat, listings and reviews).
export function TermsGate() {
  const { isGuest, profile, acceptTerms, logout } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const visible = !isGuest && !!profile && profile.termsAccepted === false;

  const accept = async () => {
    setBusy(true);
    try {
      await acceptTerms();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name="document-text-outline" size={32} color={colors.link} />
          <Text style={styles.title}>We’ve updated our terms</Text>
          <Text style={styles.text}>
            To keep AutoGuide safe, please read and accept our{' '}
            <Text style={styles.link} onPress={openTerms}>Terms of Use</Text> and{' '}
            <Text style={styles.link} onPress={openPrivacy}>Privacy Policy</Text>. They cover what’s allowed in chats, listings and reviews, and how we protect your data.
          </Text>
          <Button title="I agree" onPress={accept} loading={busy} style={{ alignSelf: 'stretch' }} />
          <Text style={styles.signout} onPress={() => logout()}>Sign out instead</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: spacing.sm },
  link: { color: colors.link, fontWeight: '800', textDecorationLine: 'underline' },
  signout: { color: colors.textMuted, marginTop: 4, padding: 6 },
}));
