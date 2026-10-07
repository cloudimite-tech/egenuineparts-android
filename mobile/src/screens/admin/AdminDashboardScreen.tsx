import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { AdminSellerRow, AdminStats, StoreStatus } from '../../types';
import { timeAgo } from '../../utils/format';
import { SellerStatusPill } from './SellerStatusPill';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

const TABS: { key: StoreStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
];

export function AdminDashboardScreen({ navigation }: Props) {
  const [tab, setTab] = useState<StoreStatus>('PENDING');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rows, setRows] = useState<AdminSellerRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (status: StoreStatus) => {
    const [s, r] = await Promise.all([
      apiClient.get<AdminStats>('/admin/stats'),
      apiClient.get<AdminSellerRow[]>('/admin/sellers', { params: { status } }),
    ]);
    setStats(s.data);
    setRows(r.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab).catch(() => setRows([]));
    }, [tab, load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Admin panel" subtitle="Verify sellers before their stores go live." back />
      <View style={styles.stats}>
        <Stat icon="time-outline" value={stats?.sellers.PENDING} label="To review" tone={colors.warning} />
        <Stat icon="storefront-outline" value={stats?.sellers.APPROVED} label="Live stores" tone={colors.success} />
        <Stat icon="people-outline" value={stats?.users.buyers} label="Buyers" tone={colors.navy} />
        <Stat icon="cube-outline" value={stats?.products} label="Listings" tone={colors.navy} />
      </View>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => { setRows(null); setTab(t.key); }}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
              {stats?.sellers[t.key] ? ` ${stats.sellers[t.key]}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {rows === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(tab).catch(() => {}); setRefreshing(false); }} />}
          ListEmptyComponent={
            <EmptyState
              icon={tab === 'PENDING' ? 'checkmark-done-outline' : 'file-tray-outline'}
              title={tab === 'PENDING' ? 'All caught up' : 'Nothing here'}
              message={tab === 'PENDING' ? 'No seller applications are waiting for review.' : `No ${tab.toLowerCase()} sellers.`}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AdminSellerDetail', { id: item.id })} activeOpacity={0.8}>
              <View style={styles.rowIcon}>
                <Ionicons name="storefront" size={20} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.store} numberOfLines={1}>{item.storeName}</Text>
                </View>
                <Text style={styles.sub} numberOfLines={1}>{item.businessName} · BR {item.brNumber}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.ownerName} · {[item.city, item.district].filter(Boolean).join(', ')}
                  {item.submittedAt ? ` · ${tab === 'PENDING' ? 'submitted' : 'updated'} ${timeAgo(item.reviewedAt && tab !== 'PENDING' ? item.reviewedAt : item.submittedAt)}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <SellerStatusPill status={item.status} />
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function Stat({ icon, value, label, tone }: { icon: keyof typeof Ionicons.glyphMap; value?: number; label: string; tone: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={tone} />
      <Text style={styles.statValue}>{value ?? '–'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 10, gap: 2 },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.white, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.navy },
  tabText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  store: { fontWeight: '800', fontSize: 16, color: colors.text, flexShrink: 1 },
  sub: { color: colors.text, fontSize: 13, marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
