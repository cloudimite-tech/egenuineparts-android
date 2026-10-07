import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ProductImage } from '../components/ProductImage';
import { QuantityStepper } from '../components/QuantityStepper';
import { UsdHint } from '../components/PriceTag';
import { useAuthStore } from '../store/authStore';
import { selectCartCount, useCartStore } from '../store/cartStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';
import { formatPrice } from '../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Cart'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function CartScreen({ navigation }: Props) {
  const isGuest = useAuthStore((s) => s.isGuest);
  const { cart, refresh, setQuantity, removeItem } = useCartStore();
  const count = useCartStore(selectCartCount);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) refresh().catch(() => {});
    }, [isGuest]),
  );

  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Cart" large />
        <EmptyState
          icon="cart-outline"
          title="Your cart lives in your account"
          message="Sign in to add parts, check out with cash on delivery and track your orders."
          actionLabel="Sign in"
          onAction={() => navigation.navigate('Welcome')}
          secondaryLabel="Create an account"
          onSecondary={() => navigation.navigate('Signup')}
        />
      </View>
    );
  }

  const change = async (itemId: string, qty: number) => {
    setBusyId(itemId);
    try {
      await setQuantity(itemId, qty);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const remove = (itemId: string, title: string) =>
    Alert.alert('Remove item?', title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusyId(itemId);
          try {
            await removeItem(itemId);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);

  const items = cart?.items ?? [];
  const problems = items.filter((i) => i.product.isActive === false || i.product.stock < i.quantity);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Cart" large right={count ? <Text style={styles.headerCount}>{count} item{count === 1 ? '' : 's'}</Text> : null} />

      {!cart ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          message="Find the right part for your vehicle and it’ll show up here."
          actionLabel="Start shopping"
          onAction={() => navigation.navigate('Main', { screen: 'Home' })}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={colors.accent}
                onRefresh={async () => {
                  setRefreshing(true);
                  await refresh().catch(() => {});
                  setRefreshing(false);
                }}
              />
            }
          >
            {cart.sellerGroups.map((group) => (
              <View key={group.store.id} style={styles.group}>
                <TouchableOpacity
                  style={styles.groupHead}
                  onPress={() => navigation.navigate('StoreProfile', { storeIdOrSlug: group.store.slug })}
                >
                  <Ionicons name="storefront-outline" size={18} color={colors.text} />
                  <Text style={styles.groupName}>{group.store.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  <Text style={styles.groupFee}>Delivery {formatPrice(group.deliveryFee)}</Text>
                </TouchableOpacity>
                {group.items.map((item, idx) => {
                  const p = item.product;
                  const gone = p.isActive === false;
                  const short = !gone && p.stock < item.quantity;
                  return (
                    <View key={item.id} style={[styles.item, idx > 0 && styles.itemBorder]}>
                      <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}>
                        <ProductImage url={p.images?.[0]?.url} style={{ width: 84, height: 84 }} iconSize={30} />
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemBrand}>{p.brand}</Text>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {p.title}
                        </Text>
                        {gone ? (
                          <Text style={styles.warn}>No longer available</Text>
                        ) : short ? (
                          <Text style={styles.warn}>{p.stock === 0 ? 'Out of stock' : `Only ${p.stock} left`}</Text>
                        ) : null}
                        <View style={styles.itemBottom}>
                          <QuantityStepper
                            value={item.quantity}
                            max={Math.max(1, p.stock)}
                            onChange={(q) => change(item.id, q)}
                          />
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.itemPrice}>{formatPrice(Number(p.price) * item.quantity, p.currency)}</Text>
                            <UsdHint amount={Number(p.price) * item.quantity} currency={p.currency} />
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => remove(item.id, p.title)} hitSlop={8} style={styles.trash}>
                        {busyId === item.id ? (
                          <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : (
                          <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}

            <View style={styles.summary}>
              <Row label={`Subtotal (${count} item${count === 1 ? '' : 's'})`} value={formatPrice(cart.subtotal)} />
              <Row label={`Delivery (${cart.sellerGroups.length} seller${cart.sellerGroups.length === 1 ? '' : 's'})`} value={formatPrice(cart.deliveryTotal)} />
              <View style={styles.divider} />
              <Row label="Total" value={formatPrice(cart.total)} strong />
              <View style={styles.codNote}>
                <Ionicons name="cash-outline" size={16} color={colors.success} />
                <Text style={styles.codText}>Pay cash (in rupees) when your parts arrive</Text>
              </View>
              {items.some((i) => i.product.currency === 'USD') ? (
                <Text style={styles.rateNote}>
                  USD-priced parts are converted at 1 USD = Rs. {cart.usdToLkr ?? 300}
                </Text>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.checkoutBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(cart.total)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, problems.length > 0 && { opacity: 0.45 }]}
              disabled={problems.length > 0}
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text style={styles.checkoutText}>{problems.length ? 'Fix cart items' : 'Checkout'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCount: { color: '#A1A1AA', fontWeight: '600' },
  group: { backgroundColor: colors.white, borderRadius: radius.md, marginBottom: spacing.sm + 4, overflow: 'hidden' },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  groupName: { fontWeight: '800', fontSize: 15 },
  groupFee: { marginLeft: 'auto', color: colors.textMuted, fontSize: 12 },
  item: { flexDirection: 'row', gap: 12, padding: spacing.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  itemBrand: { color: colors.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemTitle: { fontWeight: '600', fontSize: 14, marginTop: 2, lineHeight: 19, paddingRight: 20 },
  warn: { color: colors.accent, fontWeight: '700', fontSize: 12, marginTop: 4 },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  itemPrice: { fontWeight: '900', fontSize: 15 },
  trash: { position: 'absolute', top: spacing.md, right: spacing.md },
  summary: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { fontWeight: '600', fontSize: 14 },
  strong: { color: colors.text, fontWeight: '900', fontSize: 17 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 8 },
  codNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  codText: { color: colors.success, fontWeight: '600', fontSize: 13 },
  rateNote: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  checkoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { color: colors.textMuted, fontSize: 12 },
  totalValue: { fontWeight: '900', fontSize: 20 },
  checkoutBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 34, height: 50, justifyContent: 'center' },
  checkoutText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
