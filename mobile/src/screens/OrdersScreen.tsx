import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Order } from '../types';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';
import { ProductImage } from '../components/ProductImage';
import { formatPrice, orderNumber, shortDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

export function OrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Order[]>('/orders');
      setOrders(data);
    } catch {
      setOrders((o) => o ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="My orders" back />
      {!orders ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              message="When you buy parts, you can track them here."
              actionLabel="Start shopping"
              onAction={() => navigation.navigate('Main', { screen: 'Home' })}
            />
          }
          renderItem={({ item }) => {
            const count = item.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })} activeOpacity={0.85}>
                <View style={styles.top}>
                  <View>
                    <Text style={styles.number}>{orderNumber(item.id)}</Text>
                    <Text style={styles.date}>{shortDate(item.createdAt)}</Text>
                  </View>
                  <StatusPill status={item.status} buyerView />
                </View>
                <View style={styles.thumbs}>
                  {item.items.slice(0, 4).map((i) => (
                    <ProductImage key={i.id} url={i.product.images?.[0]?.url} style={styles.thumb} iconSize={22} />
                  ))}
                  {item.items.length > 4 ? <Text style={styles.more}>+{item.items.length - 4}</Text> : null}
                </View>
                <View style={styles.bottom}>
                  <Text style={styles.muted}>
                    {count} item{count === 1 ? '' : 's'} · {new Set(item.items.map((i) => i.store.id)).size} seller(s)
                  </Text>
                  <Text style={styles.total}>{formatPrice(item.total)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  number: { fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  date: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  thumbs: { flexDirection: 'row', gap: 8, marginVertical: spacing.md, alignItems: 'center' },
  thumb: { width: 56, height: 56 },
  more: { color: colors.textMuted, fontWeight: '700' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: colors.textMuted, fontSize: 13 },
  total: { fontWeight: '900', fontSize: 16 },
});
