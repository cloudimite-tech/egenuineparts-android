import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Category, Highlights, Product } from '../types';
import { ProductGridCard } from '../components/ProductGridCard';
import { SaleHero } from '../components/sale/SaleHero';
import { SaleMarquee } from '../components/sale/SaleMarquee';
import { useAuthStore } from '../store/authStore';
import { Logo } from '../components/Logo';
import { setStatusBarStyle } from 'expo-status-bar';
import { CategoryIcon } from '../components/CategoryIcon';
import { EmptyState } from '../components/EmptyState';
import { VehiclePickerSheet } from '../components/VehiclePickerSheet';
import { activeFilterCount, DEFAULT_FILTERS, FilterSheet, Filters, SORTS } from '../components/FilterSheet';
import { useBrowseFilterStore } from '../store/browseFilterStore';
import { useVehicleStore, vehicleLabel } from '../store/vehicleStore';
import { useWishlistStore } from '../store/wishlistStore';
import { toast } from '../store/toastStore';
import { useRequireAccount, errorMessage } from '../utils/useRequireAccount';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const GAP = 12;

export function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.md * 2 - GAP) / 2;

  const {
    categoryId,
    categoryName,
    setCategory,
    clear: clearCategory,
    onSaleOnly,
    setOnSaleOnly,
    vehicleSheetRequested,
    requestVehicleSheet,
  } = useBrowseFilterStore();
  const vehicle = useVehicleStore((s) => s.vehicle);
  const { ids: savedIds, toggle } = useWishlistStore();
  const requireAccount = useRequireAccount();
  const profile = useAuthStore((s) => s.profile);

  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [highlights, setHighlights] = useState<Highlights | null>(null);

  // Categories + highlights refresh whenever Home is focused (and on
  // pull-to-refresh), so a hiccup at startup doesn't leave them empty.
  const loadCategories = useCallback(() => {
    apiClient.get<Category[]>('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, []),
  );

  // The assistant can ask Home to open the vehicle picker.
  useFocusEffect(
    useCallback(() => {
      if (vehicleSheetRequested) {
        requestVehicleSheet(false);
        setVehicleOpen(true);
      }
    }, [vehicleSheetRequested]),
  );

  const loadHighlights = useCallback(() => {
    apiClient
      .get<Highlights>('/products/highlights', {
        params: { make: vehicle?.make, model: vehicle?.model, year: vehicle?.year },
      })
      .then((r) => setHighlights(r.data))
      .catch(() => {});
  }, [vehicle]);
  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadHighlights();
    }, [loadCategories, loadHighlights]),
  );


  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await apiClient.get<Product[]>('/products', {
        params: {
          q: query || undefined,
          categoryId: categoryId ?? undefined,
          sort: filters.sort,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          brands: filters.brands.length ? filters.brands.join(',') : undefined,
          onSale: onSaleOnly ? 'true' : undefined,
          make: vehicle?.make,
          model: vehicle?.model,
          year: vehicle?.year,
        },
      });
      setProducts(data);
    } catch (e) {
      setError(errorMessage(e, 'Couldn’t reach Genuine Parts.lk. Check your connection.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, categoryId, filters, vehicle, onSaleOnly]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const brandsInResults = useMemo(() => Array.from(new Set(products.map((p) => p.brand))), [products]);
  const filterCount = activeFilterCount(filters);
  const isFiltered = !!(query || categoryId || filterCount || onSaleOnly);
  const sortLabel = SORTS.find((s) => s.key === filters.sort)?.label ?? 'Best match';

  const onToggleSave = (productId: string) =>
    requireAccount(async () => {
      try {
        const nowSaved = await toggle(productId);
        toast.success(nowSaved ? 'Saved to wishlist' : 'Removed from wishlist');
      } catch (e) {
        toast.error(errorMessage(e));
      }
    }, 'Sign in to save parts to your wishlist.');

  const clearAll = () => {
    setTyped('');
    setQuery('');
    clearCategory();
    setOnSaleOnly(false);
    setFilters(DEFAULT_FILTERS);
  };

  const viewAllHighlights = () => {
    if (!highlights) return;
    if (highlights.mode === 'flash' || highlights.mode === 'deals') setOnSaleOnly(true);
    else setFilters((f) => ({ ...f, sort: highlights.mode === 'top' ? 'rating' : 'newest' }));
  };

  const header = (
    <View>
      {/* Top categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {categories.map((c) => {
          const active = categoryId === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.catItem}
              onPress={() => (active ? clearCategory() : setCategory(c.id, c.name))}
            >
              <View style={[styles.catCircle, active && styles.catCircleActive]}>
                <CategoryIcon icon={c.icon} size={24} color={active ? colors.white : colors.accent} />
              </View>
              <Text style={[styles.catLabel, active && { color: colors.accent, fontWeight: '800' }]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!isFiltered ? (
        <SaleHero
          data={highlights}
          onOpenProduct={(p) => navigation.navigate('ProductDetail', { productId: p.id })}
          onViewAll={viewAllHighlights}
          onExpired={loadHighlights}
          onPromo={(target) => {
            if (target === 'deals') setOnSaleOnly(true);
            else if (target === 'categories') navigation.navigate('Main', { screen: 'Categories' });
            else
              requireAccount(
                () => (profile?.store ? navigation.navigate('SellerDashboard') : navigation.navigate('StoreSetup', { mode: 'create' })),
                'Create an account to open your store.',
              );
          }}
        />
      ) : null}

      {!isFiltered && highlights && highlights.products.length > 0 ? (
        <SaleMarquee
          data={highlights}
          onOpenProduct={(p) => navigation.navigate('ProductDetail', { productId: p.id })}
          onViewAll={viewAllHighlights}
          onExpired={loadHighlights}
        />
      ) : null}

      {!isFiltered && (
        <View style={styles.trust}>
          <TrustPoint icon="shield-checkmark-outline" text="Verified sellers" />
          <TrustPoint icon="cash-outline" text="Cash on delivery" />
          <TrustPoint icon="bicycle" text="Island-wide" />
        </View>
      )}

      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {loading ? 'Loading…' : `${products.length} part${products.length === 1 ? '' : 's'}`}
          {!loading && vehicle ? <Text style={styles.countSub}> for your {vehicle.model}</Text> : null}
        </Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
          <Ionicons name="options-outline" size={16} color={colors.text} />
          <Text style={styles.filterText}>{filters.sort === 'best_match' ? 'Filter' : sortLabel}</Text>
          {filterCount ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {(categoryId || query || onSaleOnly) && (
        <View style={styles.activeRow}>
          {onSaleOnly ? <ActiveChip label="On sale" onClear={() => setOnSaleOnly(false)} /> : null}
          {categoryId ? <ActiveChip label={categoryName ?? 'Category'} onClear={clearCategory} /> : null}
          {query ? (
            <ActiveChip
              label={`“${query}”`}
              onClear={() => {
                setQuery('');
                setTyped('');
              }}
            />
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Logo height={38} />
          <TouchableOpacity
            onPress={() => requireAccount(() => navigation.navigate('Wishlist'), 'Sign in to see your wishlist.')}
            hitSlop={8}
          >
            <Ionicons name="heart-outline" size={26} color={colors.navy} />
          </TouchableOpacity>
        </View>

        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search part, brand or part no."
            placeholderTextColor={colors.textFaint}
            value={typed}
            onChangeText={setTyped}
            returnKeyType="search"
            onSubmitEditing={() => setQuery(typed.trim())}
          />
          {typed ? (
            <TouchableOpacity
              onPress={() => {
                setTyped('');
                setQuery('');
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={20} color={colors.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.vehicleRow} onPress={() => setVehicleOpen(true)}>
          <Ionicons name="car-sport" size={18} color={colors.accent} />
          <Text style={styles.vehicleText} numberOfLines={1}>
            {vehicle ? (
              <>
                Fits <Text style={styles.vehicleStrong}>{vehicleLabel(vehicle)}</Text>
              </>
            ) : (
              'Add your vehicle to see parts that fit'
            )}
          </Text>
          <Text style={styles.vehicleChange}>{vehicle ? 'Change' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [] : products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: spacing.md }}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              loadCategories();
              loadHighlights();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
          ) : error ? (
            <EmptyState icon="cloud-offline-outline" title="Can’t load parts" message={error} actionLabel="Try again" onAction={load} />
          ) : (
            <EmptyState
              icon="search"
              title="No parts found"
              message={vehicle ? `Nothing matches for your ${vehicleLabel(vehicle)} yet. Try clearing filters or another vehicle.` : 'Try a different search or clear your filters.'}
              actionLabel={isFiltered ? 'Clear filters' : undefined}
              onAction={isFiltered ? clearAll : undefined}
            />
          )
        }
        renderItem={({ item }) => (
          <ProductGridCard
            product={item}
            width={cardWidth}
            saved={savedIds.includes(item.id)}
            onToggleSave={() => onToggleSave(item.id)}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          />
        )}
      />

      <TouchableOpacity style={styles.assistantFab} onPress={() => navigation.navigate('Assistant')} activeOpacity={0.9}>
        <MaterialCommunityIcons name="robot-happy-outline" size={26} color={colors.white} />
      </TouchableOpacity>

      <VehiclePickerSheet visible={vehicleOpen} onClose={() => setVehicleOpen(false)} />
      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={setFilters}
        availableBrands={brandsInResults}
      />
    </View>
  );
}

function TrustPoint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.trustPoint}>
      <Ionicons name={icon} size={15} color={colors.success} />
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <TouchableOpacity style={styles.activeChip} onPress={onClear}>
      <Text style={styles.activeChipText} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="close" size={14} color={colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // White header so the navy/red logo reads clearly.
  header: {
    backgroundColor: colors.white,
    paddingTop: HEADER_TOP,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md },
  vehicleText: { flex: 1, color: colors.textMuted, fontSize: 14 },
  vehicleStrong: { color: colors.navy, fontWeight: '800' },
  vehicleChange: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  catRow: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 14 },
  catItem: { alignItems: 'center', width: 70 },
  catCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  catCircleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  catLabel: { fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 6, textAlign: 'center' },
  trust: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm + 2,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  trustPoint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 12, fontWeight: '700', color: colors.text },
  assistantFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 3,
    borderColor: colors.white,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 2,
  },
  count: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1 },
  countSub: { fontWeight: '500', color: colors.textMuted, fontSize: 14 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterText: { fontWeight: '700', fontSize: 13, color: colors.text },
  filterBadge: {
    backgroundColor: colors.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.md, paddingBottom: spacing.sm + 2 },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 220,
  },
  activeChipText: { color: colors.white, fontWeight: '700', fontSize: 12, flexShrink: 1 },
});
