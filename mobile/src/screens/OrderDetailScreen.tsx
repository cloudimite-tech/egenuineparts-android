import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { FulfillmentStatus, Order, OrderItem } from '../types';
import { Header } from '../components/Header';
import { StatusPill } from '../components/StatusPill';
import { ProductImage } from '../components/ProductImage';
import { Button } from '../components/Button';
import { useCartStore } from '../store/cartStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';
import { formatPrice, orderNumber, shortDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const STEPS: { key: FulfillmentStatus; label: string }[] = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    apiClient.get<Order>(`/orders/${orderId}`).then((r) => setOrder(r.data)).catch(() => {});
    apiClient.get<string[]>('/products/reviewed').then((r) => setReviewed(r.data)).catch(() => {});
  }, [orderId]);
  useFocusEffect(load);

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Order" back />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </View>
    );
  }

  // Group lines by store — each store ships its part of the order separately.
  const groups = Object.values(
    order.items.reduce<Record<string, { store: OrderItem['store']; items: OrderItem[] }>>((acc, item) => {
      (acc[item.store.id] ??= { store: item.store, items: [] }).items.push(item);
      return acc;
    }, {}),
  );
  const canCancel = order.items.every((i) => i.fulfillmentStatus === 'PENDING' || i.fulfillmentStatus === 'PAID');

  const cancel = () =>
    Alert.alert('Cancel this order?', 'All items will be cancelled and the sellers notified.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const { data } = await apiClient.post<Order>(`/orders/${order.id}/cancel`);
            setOrder(data);
            toast.info('Order cancelled');
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);

  const buyAgain = async (productId: string) => {
    try {
      await useCartStore.getState().addItem(productId, 1);
      toast.success('Added to cart');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={orderNumber(order.id)} subtitle={`Placed ${shortDate(order.createdAt)}`} back right={<StatusPill status={order.status} buyerView />} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        {groups.map(({ store, items }) => {
          const status = items[0].fulfillmentStatus;
          const stepIndex = STEPS.findIndex((s) => s.key === status);
          return (
            <View key={store.id} style={styles.card}>
              <View style={styles.storeRow}>
                <Ionicons name="storefront-outline" size={18} color={colors.text} />
                <Text style={styles.storeName}>{store.name}</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <StatusPill status={status} buyerView />
                </View>
              </View>

              {status !== 'CANCELLED' ? (
                <View style={styles.track}>
                  {STEPS.map((s, i) => {
                    const done = stepIndex >= i;
                    return (
                      <React.Fragment key={s.key}>
                        {i > 0 ? <View style={[styles.trackLine, done && styles.trackLineDone]} /> : null}
                        <View style={{ alignItems: 'center', width: 64 }}>
                          <View style={[styles.trackDot, done && styles.trackDotDone]}>
                            {done ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
                          </View>
                          <Text style={[styles.trackLabel, done && { color: colors.text, fontWeight: '800' }]}>{s.label}</Text>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
              ) : null}

              {items.map((i) => (
                <View key={i.id} style={styles.line}>
                  <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: i.productId })}>
                    <ProductImage url={i.product.images?.[0]?.url} style={{ width: 64, height: 64 }} iconSize={24} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineTitle} numberOfLines={2}>
                      {i.product.title}
                    </Text>
                    <Text style={styles.muted}>
                      Qty {i.quantity} · {formatPrice(i.unitPrice, i.currency)}
                      {i.currency === 'USD' && i.unitPriceLkr ? ` (paid as ${formatPrice(i.unitPriceLkr)})` : ''}
                    </Text>
                    {i.fulfillmentStatus === 'DELIVERED' ? (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        {reviewed.includes(i.productId) ? (
                          <View style={styles.reviewedTag}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                            <Text style={styles.reviewedText}>Reviewed</Text>
                          </View>
                        ) : (
                          <Button
                            title="Write a review"
                            size="sm"
                            variant="dark"
                            icon="star-outline"
                            onPress={() =>
                              navigation.navigate('WriteReview', {
                                productId: i.productId,
                                title: i.product.title,
                                imageUrl: i.product.images?.[0]?.url,
                              })
                            }
                          />
                        )}
                        <Button title="Buy again" size="sm" variant="outline" onPress={() => buyAgain(i.productId)} />
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery</Text>
          <Text style={styles.addr}>{order.addressLine1}</Text>
          {order.addressLine2 ? <Text style={styles.addr}>{order.addressLine2}</Text> : null}
          <Text style={styles.addr}>
            {order.city}
            {order.district ? `, ${order.district}` : ''}
          </Text>
          {order.contactPhone ? <Text style={[styles.muted, { marginTop: 4 }]}>{order.contactPhone}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment</Text>
          <Row label="Subtotal" value={formatPrice(order.subtotal)} />
          <Row label="Delivery" value={formatPrice(order.deliveryFee)} />
          <Row label={order.paymentMethod === 'COD' ? 'Total (cash on delivery)' : 'Total'} value={formatPrice(order.total)} strong />
        </View>

        {canCancel && order.status !== 'CANCELLED' ? (
          <Button title="Cancel order" variant="ghost" onPress={cancel} loading={cancelling} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={[{ color: colors.textMuted }, strong && styles.strong]}>{label}</Text>
      <Text style={[{ fontWeight: '600' }, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeName: { fontWeight: '800', fontSize: 15 },
  track: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginVertical: spacing.md },
  trackLine: { flex: 1, height: 3, backgroundColor: colors.divider, marginTop: 9, marginHorizontal: -20 },
  trackLineDone: { backgroundColor: colors.success },
  trackDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  trackDotDone: { backgroundColor: colors.success },
  trackLabel: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  line: { flexDirection: 'row', gap: 12, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  lineTitle: { fontWeight: '600', fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  reviewedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  reviewedText: { color: colors.success, fontWeight: '700', fontSize: 13 },
  addr: { fontSize: 15, color: colors.text, lineHeight: 21 },
  strong: { fontWeight: '900', color: colors.text, fontSize: 16 },
});
