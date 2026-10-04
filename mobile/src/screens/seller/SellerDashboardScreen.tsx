import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { SellerDashboard } from '../../types';
import { Header, HeaderIconButton } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { useChatStore } from '../../store/chatStore';
import { formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerDashboard'>;

export function SellerDashboardScreen({ navigation }: Props) {
  const [data, setData] = useState<SellerDashboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const unread = useChatStore((s) => s.unread);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<SellerDashboard>('/seller/dashboard');
      setData(data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  if (failed && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Seller Center" back />
        <EmptyState icon="storefront-outline" title="No store yet" message="Set up your store to start selling." actionLabel="Set up store" onAction={() => navigation.replace('StoreSetup', { mode: 'create' })} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={data?.store.name ?? 'Seller Center'}
        subtitle="Seller Center"
        back
        right={<HeaderIconButton icon="eye-outline" onPress={() => data && navigation.navigate('StoreProfile', { storeIdOrSlug: data.store.slug })} />}
      />
      {!data ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <View style={styles.revenue}>
            <Text style={styles.revenueLabel}>TOTAL SALES</Text>
            <Text style={styles.revenueValue}>{formatPrice(data.stats.revenue)}</Text>
            <Text style={styles.revenueSub}>{data.stats.unitsSold} unit{data.stats.unitsSold === 1 ? '' : 's'} sold · excludes cancelled orders</Text>
          </View>

          <View style={styles.grid}>
            <StatCard
              icon="time-outline"
              value={data.stats.pendingOrders}
              label="Orders to ship"
              tone={data.stats.pendingOrders ? 'accent' : undefined}
              onPress={() => navigation.navigate('SellerOrders')}
            />
            <StatCard icon="chatbubbles-outline" value={unread} label="Unread chats" tone={unread ? 'accent' : undefined} onPress={() => navigation.navigate('Main', { screen: 'Messages' })} />
            <StatCard icon="pricetag-outline" value={data.stats.activeProducts} label="Active listings" onPress={() => navigation.navigate('SellerProducts')} />
            <StatCard icon="warning-outline" value={data.stats.lowStock} label="Low stock (≤3)" tone={data.stats.lowStock ? 'warn' : undefined} onPress={() => navigation.navigate('SellerProducts')} />
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ProductForm')} activeOpacity={0.85}>
            <View style={styles.addIcon}>
              <Ionicons name="add" size={26} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTitle}>List a new part</Text>
              <Text style={styles.addSub}>Photos, price, stock and fitment in one form</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.menu}>
            <MenuRow icon="cube-outline" label="My listings" detail={`${data.stats.activeProducts}`} onPress={() => navigation.navigate('SellerProducts')} />
            <MenuRow icon="receipt-outline" label="Orders" detail={data.stats.pendingOrders ? `${data.stats.pendingOrders} to ship` : undefined} onPress={() => navigation.navigate('SellerOrders')} />
            <MenuRow icon="chatbubbles-outline" label="Buyer messages" onPress={() => navigation.navigate('Main', { screen: 'Messages' })} />
            <MenuRow icon="settings-outline" label="Store settings" onPress={() => navigation.navigate('StoreSetup', { mode: 'edit' })} />
            <MenuRow icon="storefront-outline" label="View my store" onPress={() => navigation.navigate('StoreProfile', { storeIdOrSlug: data.store.slug })} last />
          </View>

          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={20} color={colors.info} />
            <Text style={styles.tipText}>
              Listings with clear photos, a part number and a fitment list show up for buyers who've saved that vehicle — and get a green “Fits” badge.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  tone?: 'accent' | 'warn';
  onPress: () => void;
}) {
  const color = tone === 'accent' ? colors.accent : tone === 'warn' ? colors.warning : colors.text;
  return (
    <TouchableOpacity style={styles.stat} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuRow({ icon, label, detail, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={21} color={colors.text} />
      <Text style={styles.rowLabel}>{label}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  revenue: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm + 4 },
  revenueLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  revenueValue: { color: colors.white, fontSize: 34, fontWeight: '900', marginTop: 4, letterSpacing: -0.8 },
  revenueSub: { color: '#A1A1AA', fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4, marginBottom: spacing.sm + 4 },
  stat: { width: '47.5%', flexGrow: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md },
  statValue: { fontSize: 28, fontWeight: '900', marginTop: 8 },
  statLabel: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4 },
  addIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  addTitle: { color: colors.white, fontWeight: '900', fontSize: 16 },
  addSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  menu: { backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  rowDetail: { color: colors.textMuted, fontSize: 13 },
  tip: { flexDirection: 'row', gap: 10, backgroundColor: colors.infoSoft, borderRadius: radius.md, padding: spacing.md },
  tipText: { flex: 1, color: '#1E3A8A', fontSize: 13, lineHeight: 19 },
});
