import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import { FulfillmentStatus } from '../types';

const MAP: Record<FulfillmentStatus, { label: string; fg: string; bg: string }> = {
  PENDING: { label: 'To ship', fg: colors.warning, bg: colors.warningSoft },
  PAID: { label: 'Paid', fg: colors.info, bg: colors.infoSoft },
  SHIPPED: { label: 'Shipped', fg: colors.info, bg: colors.infoSoft },
  DELIVERED: { label: 'Delivered', fg: colors.success, bg: colors.successSoft },
  CANCELLED: { label: 'Cancelled', fg: colors.textMuted, bg: '#EFEFF2' },
};

export function StatusPill({ status, buyerView }: { status: FulfillmentStatus; buyerView?: boolean }) {
  const s = MAP[status] ?? MAP.PENDING;
  const label = buyerView && status === 'PENDING' ? 'Processing' : s.label;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '800' },
});
