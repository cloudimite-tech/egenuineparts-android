import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { FulfillmentStatus, SellerOrder } from '../../types';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { StatusPill } from '../../components/StatusPill';
import { ProductImage } from '../../components/ProductImage';
import { Button } from '../../components/Button';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { formatPrice, orderNumber, timeAgo } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerOrders'>;

const TABS: { key: string; label: string; match: FulfillmentStatus[] }[] = [
  { key: 'ship', label: 'To ship', match: ['PENDING', 'PAID'] },
  { key: 'shipped', label: 'Shipped', match: ['SHIPPED'] },
  { key: 'done', label: 'Delivered', match: ['DELIVERED'] },
  { key: 'cancelled', label: 'Cancelled', match: ['CANCELLED'] },
];

export function SellerOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [tab, setTab] = useState('ship');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<SellerOrder[]>('/seller/orders');
      setOrders(data);
    } catch {
      setOrders((o) => o ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  const update = async (order: SellerOrder, status: FulfillmentStatus) => {
    setBusy(order.id + status);
    try {
      await apiClient.patch(`/seller/orders/${order.id}/status`, { status });
      toast.success(status === 'SHIPPED' ? 'Marked as shipped' : status === 'DELIVERED' ? 'Marked as delivered' : 'Order cancelled');
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = (o: SellerOrder) =>
    Alert.alert('Cancel this order?', 'Stock goes back to your listings and the buyer sees it as cancelled.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => update(o, 'CANCELLED') },
    ]);

  const current = TABS.find((t) => t.key === tab)!;
  const shown = (orders ?? []).filter((o) => current.match.includes(o.status));
  const counts = Object.fromEntries(TABS.map((t) => [t.key, (orders ?? []).filter((o) => t.match.includes(o.status)).length]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Orders" subtitle="Seller Center" back>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabOn]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>
                {t.label}
                {counts[t.key] ? ` ${counts[t.key]}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Header>
      {!orders ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={tab === 'ship' ? 'Nothing to ship' : `No ${current.label.toLowerCase()} orders`}
              message={tab === 'ship' ? 'New orders for your parts will appear here.' : undefined}
            />
          }
          renderItem={({ item: o }) => (
            <View style={styles.card}>
              <View style={styles.top}>
                <View>
                  <Text style={styles.number}>{orderNumber(o.id)}</Text>
                  <Text style={styles.muted}>
                    {o.buyerName} · {timeAgo(o.createdAt)}
                  </Text>
                </View>
                <StatusPill status={o.status} />
              </View>

              {o.items.map((i) => (
                <TouchableOpacity key={i.id} style={styles.line} onPress={() => navigation.navigate('ProductDetail', { productId: i.product.id })}>
                  <ProductImage url={i.product.images?.[0]?.url} style={{ width: 52, height: 52 }} iconSize={22} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineTitle} numberOfLines={1}>
                      {i.product.title}
                    </Text>
                    <Text style={styles.muted}>
                      Qty {i.quantity} × {formatPrice(i.unitPrice, i.currency)}
                      {i.currency === 'USD' && i.unitPriceLkr ? ` (≈ ${formatPrice(i.unitPriceLkr)})` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {o.status !== 'CANCELLED' ? (
                <View style={styles.ship}>
                  <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shipText}>
                      {o.shipping.addressLine1}
                      {o.shipping.addressLine2 ? `, ${o.shipping.addressLine2}` : ''}
                    </Text>
                    <Text style={styles.shipText}>
                      {o.shipping.city}
                      {o.shipping.district ? `, ${o.shipping.district}` : ''}
                    </Text>
                    {o.shipping.contactPhone ? (
                      <Text style={styles.phone}>
                        <Ionicons name="call-outline" size={12} /> {o.shipping.contactPhone} · for delivery only
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.totals}>
                <Text style={styles.muted}>{o.paymentMethod === 'COD' ? 'Collect cash on delivery' : o.paymentMethod}</Text>
                <Text style={styles.total}>{formatPrice(o.subtotal)}</Text>
              </View>

              {o.status === 'PENDING' || o.status === 'PAID' ? (
                <View style={styles.actions}>
                  <Button title="Cancel" variant="outline" size="sm" onPress={() => confirmCancel(o)} style={{ flex: 1 }} loading={busy === o.id + 'CANCELLED'} />
                  <Button title="Mark as shipped" size="sm" icon="bicycle" onPress={() => update(o, 'SHIPPED')} style={{ flex: 2 }} loading={busy === o.id + 'SHIPPED'} />
                </View>
              ) : o.status === 'SHIPPED' ? (
                <View style={styles.actions}>
                  <Button title="Mark as delivered" size="sm" variant="dark" icon="checkmark-done" onPress={() => update(o, 'DELIVERED')} style={{ flex: 1 }} loading={busy === o.id + 'DELIVERED'} />
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.headerElevated },
  tabOn: { backgroundColor: colors.white },
  tabText: { color: '#C9C9CF', fontWeight: '700', fontSize: 12 },
  tabTextOn: { color: colors.black },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  number: { fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  line: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.divider },
  lineTitle: { fontWeight: '600' },
  ship: { flexDirection: 'row', gap: 10, backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, marginTop: spacing.sm },
  shipText: { fontSize: 14, color: colors.text, lineHeight: 19 },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  totals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm + 4 },
  total: { fontWeight: '900', fontSize: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
