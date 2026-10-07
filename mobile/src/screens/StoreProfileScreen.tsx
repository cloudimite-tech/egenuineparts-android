import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { shareStore } from '../utils/share';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Store } from '../types';
import { ProductGridCard } from '../components/ProductGridCard';
import { EmptyState } from '../components/EmptyState';
import { useWishlistStore } from '../store/wishlistStore';
import { toast } from '../store/toastStore';
import { errorMessage, useRequireAccount } from '../utils/useRequireAccount';
import { initials } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'StoreProfile'>;

export function StoreProfileScreen({ route, navigation }: Props) {
  const { storeIdOrSlug } = route.params;
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.md * 2 - 12) / 2;
  const { ids: savedIds, toggle } = useWishlistStore();
  const requireAccount = useRequireAccount();
  const [store, setStore] = useState<Store | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setFailed(false);
    apiClient.get<Store>(`/stores/${storeIdOrSlug}`).then((r) => setStore(r.data)).catch(() => setFailed(true));
  }, [storeIdOrSlug]);
  useEffect(load, [load]);

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (store?.products ?? []).filter(
      (p) => !q || p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.partNumber?.toLowerCase().includes(q),
    );
  }, [store, search]);

  if (failed) return <EmptyState icon="storefront-outline" title="Store not found" actionLabel="Go back" onAction={() => navigation.goBack()} />;
  if (!store) return <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />;

  const save = (id: string) =>
    requireAccount(async () => {
      try {
        const now = await toggle(id);
        toast.success(now ? 'Saved to wishlist' : 'Removed from wishlist');
      } catch (e) {
        toast.error(errorMessage(e));
      }
    }, 'Sign in to save parts to your wishlist.');

  const header = (
    <View>
      <View style={styles.cover}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => shareStore(store)} style={[styles.back, { left: undefined, right: spacing.md }]} hitSlop={10} accessibilityLabel="Share store">
          <Ionicons name="share-social-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(store.name)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
          <Text style={styles.name}>{store.name}</Text>
          {store.verified ? <Ionicons name="shield-checkmark" size={20} color={colors.info} /> : null}
        </View>
        {store.bio ? <Text style={styles.bio}>{store.bio}</Text> : null}
        <View style={styles.stats}>
          <Stat value={store.stats?.avgRating ? `★ ${store.stats.avgRating}` : '—'} label={`${store.stats?.reviewCount ?? 0} ratings`} />
          <Stat value={String(store.stats?.totalSold ?? 0)} label="sold" />
          <Stat value={String(store.stats?.productCount ?? 0)} label="parts" />
        </View>
        <View style={styles.policies}>
          {store.shipsFrom ? <Policy icon="location-outline" text={`Ships from ${store.shipsFrom}`} /> : null}
          {store.returnsPolicy ? <Policy icon="return-down-back-outline" text={`Returns: ${store.returnsPolicy}`} /> : null}
          <Policy icon="chatbubbles-outline" text="Chat with this store from any of its listings" />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 15 }}
            placeholder={`Search ${store.stats?.productCount ?? ''} parts in this store`}
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12, paddingHorizontal: spacing.md }}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      ListEmptyComponent={<EmptyState icon="cube-outline" title={search ? 'No matching parts' : 'No parts listed yet'} />}
      renderItem={({ item }) => (
        <ProductGridCard
          product={item}
          width={cardWidth}
          saved={savedIds.includes(item.id)}
          onToggleSave={() => save(item.id)}
          onPress={() => navigation.push('ProductDetail', { productId: item.id })}
        />
      )}
    />
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Policy({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: 13, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: HEADER_TOP + 70, backgroundColor: colors.headerBg, borderBottomWidth: 3, borderBottomColor: colors.accent },
  back: { position: 'absolute', top: HEADER_TOP, left: spacing.md - 6 },
  profile: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingBottom: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -42,
    borderWidth: 4,
    borderColor: colors.white,
  },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 28 },
  name: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  bio: { color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  stats: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: spacing.md },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue: { fontWeight: '900', fontSize: 18 },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  policies: { gap: 8, marginTop: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 46,
    marginTop: spacing.md,
  },
});
