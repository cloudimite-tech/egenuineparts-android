import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { Product } from '../../types';
import { Header, HeaderIconButton } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { ProductImage } from '../../components/ProductImage';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { formatPrice } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerProducts'>;

export function SellerProductsScreen({ navigation }: Props) {
  const [items, setItems] = useState<Product[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Product[]>('/products/mine');
      setItems(data);
    } catch {
      setItems((i) => i ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  const remove = (p: Product) =>
    Alert.alert('Remove listing?', `"${p.title}" will be hidden from buyers. Past orders and chats keep working.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/products/${p.id}`);
            setItems((list) => list?.filter((x) => x.id !== p.id) ?? null);
            toast.info('Listing removed');
          } catch (e) {
            toast.error(errorMessage(e));
          }
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="My listings"
        subtitle={items ? `${items.length} active` : undefined}
        back
        right={<HeaderIconButton icon="add" onPress={() => navigation.navigate('ProductForm')} />}
      />
      {!items ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={
            <EmptyState
              icon="pricetag-outline"
              title="No listings yet"
              message="List your first part — it takes about a minute."
              actionLabel="List a part"
              onAction={() => navigation.navigate('ProductForm')}
            />
          }
          renderItem={({ item }) => {
            const low = item.stock <= 3;
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('ProductForm', { productId: item.id })}>
                <ProductImage url={item.images?.[0]?.url} categorySlug={item.category?.slug} style={{ width: 76, height: 76 }} iconSize={28} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.brand}>{item.brand}</Text>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.price}>{formatPrice(item.price, item.currency)}</Text>
                    {item.onSale ? (
                      <View style={styles.salePill}>
                        <Ionicons name="flash" size={11} color="#FF5A1F" />
                        <Text style={styles.salePillText}>On sale</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.metaRow}>
                    <View style={[styles.stock, low && styles.stockLow]}>
                      <Text style={[styles.stockText, low && { color: item.stock === 0 ? colors.accent : colors.warning }]}>
                        {item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
                      </Text>
                    </View>
                    <Text style={styles.meta}>{item.soldCount ?? 0} sold</Text>
                    {item.avgRating ? <Text style={styles.meta}>★ {item.avgRating}</Text> : null}
                    {!item.images?.length ? <Text style={[styles.meta, { color: colors.warning }]}>No photo</Text> : null}
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => navigation.navigate('ProductForm', { productId: item.id })} hitSlop={8}>
                    <Ionicons name="create-outline" size={21} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={21} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ProductForm')} activeOpacity={0.9}>
        <Ionicons name="add" size={22} color={colors.white} />
        <Text style={styles.fabText}>List a part</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm + 2 },
  brand: { color: colors.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontWeight: '700', fontSize: 14, marginTop: 1 },
  price: { fontWeight: '900', fontSize: 15, marginTop: 4 },
  salePill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FFF1EA', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  salePillText: { color: '#C2410C', fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  stock: { backgroundColor: colors.successSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  stockLow: { backgroundColor: colors.warningSoft },
  stockText: { color: colors.success, fontSize: 11, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 12 },
  actions: { justifyContent: 'space-between', paddingVertical: 2 },
  fab: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    height: 52,
    ...shadow,
  },
  fabText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
