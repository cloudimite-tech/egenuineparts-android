import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme/theme';
import { Button } from '../components/Button';
import { orderNumber } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderSuccess'>;

export function OrderSuccessScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  return (
    <View style={styles.root}>
      <View style={styles.circle}>
        <Ionicons name="checkmark" size={56} color={colors.white} />
      </View>
      <Text style={styles.title}>Order placed!</Text>
      <Text style={styles.number}>{orderNumber(orderId)}</Text>
      <Text style={styles.body}>
        The seller has been notified and will ship your parts soon. You'll pay cash when they arrive.
      </Text>
      <View style={styles.steps}>
        <Step icon="receipt-outline" text="Seller confirms and packs your order" />
        <Step icon="bicycle" text="Courier delivers island-wide" />
        <Step icon="star-outline" text="Rate your parts once delivered" />
      </View>
      <Button title="View order" onPress={() => navigation.replace('OrderDetail', { orderId })} style={{ alignSelf: 'stretch' }} />
      <Button title="Continue shopping" variant="ghost" onPress={() => navigation.goBack()} style={{ alignSelf: 'stretch', marginTop: 6 }} />
    </View>
  );
}

function Step({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.step}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  circle: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', marginTop: spacing.lg },
  number: { color: colors.textMuted, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  body: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 21, maxWidth: 320 },
  steps: { alignSelf: 'stretch', backgroundColor: colors.bg, borderRadius: 14, padding: spacing.md, gap: 14, marginVertical: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { fontWeight: '600', flex: 1 },
});
