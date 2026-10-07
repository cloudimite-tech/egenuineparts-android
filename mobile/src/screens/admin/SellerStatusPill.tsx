import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/theme';
import { StoreStatus } from '../../types';

const MAP: Record<StoreStatus, { label: string; fg: string; bg: string }> = {
  PENDING: { label: 'Pending', fg: colors.warning, bg: colors.warningSoft },
  APPROVED: { label: 'Approved', fg: colors.success, bg: colors.successSoft },
  REJECTED: { label: 'Rejected', fg: colors.accent, bg: colors.accentSoft },
  SUSPENDED: { label: 'Suspended', fg: colors.textMuted, bg: '#EFEFF2' },
};

export function SellerStatusPill({ status }: { status: StoreStatus }) {
  const s = MAP[status] ?? MAP.PENDING;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '800' },
});
