import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Category } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';
import { EmptyState } from '../components/EmptyState';
import { useBrowseFilterStore } from '../store/browseFilterStore';
import { GradientHeader } from '../components/GradientHeader';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Categories'>,
  NativeStackScreenProps<RootStackParamList>
>;

const SIDEBAR = 92;
const TILE_GAP = 10;

export function CategoriesScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const tileWidth = (width - SIDEBAR - spacing.md * 2 - TILE_GAP) / 2;

  const setCategory = useBrowseFilterStore((s) => s.setCategory);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    apiClient
      .get<Category[]>('/categories')
      .then(({ data }) => {
        setCategories(data);
        setSelectedId((cur) => cur ?? data[0]?.id ?? null);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const open = (c: Category) => {
    setCategory(c.id, c.name);
    navigation.navigate('Main', { screen: 'Home' });
  };

  const q = search.trim().toLowerCase();
  // Searching looks through sub-categories too ("pads" finds Brake pads).
  const matches = q
    ? categories.flatMap((p) =>
        [p, ...p.children].filter((c) => c.name.toLowerCase().includes(q)).map((c) => ({ ...c, parentName: p.name })),
      )
    : [];
  const selected = categories.find((c) => c.id === selectedId) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <GradientHeader style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories"
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      </GradientHeader>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : failed ? (
        <EmptyState icon="cloud-offline-outline" title="Can’t load categories" actionLabel="Try again" onAction={load} />
      ) : q ? (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {matches.length === 0 ? (
            <Text style={styles.muted}>No categories match “{search}”.</Text>
          ) : (
            matches.map((c) => (
              <TouchableOpacity key={c.id} style={styles.searchRow} onPress={() => open(c)}>
                <View style={styles.searchIcon}>
                  <CategoryIcon slug={c.slug} icon={c.icon} size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchTitle}>{c.name}</Text>
                  {c.parentName !== c.name ? <Text style={styles.muted}>in {c.parentName}</Text> : null}
                </View>
                <Text style={styles.muted}>{c.productCount}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Fixed-width rail. Wrapped in a View because a bare ScrollView
              grows to share space with its sibling. */}
          <View style={styles.rail}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((c) => {
                const active = c.id === selectedId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.railItem, active && styles.railItemActive]}
                    onPress={() => setSelectedId(c.id)}
                  >
                    {active ? <View style={styles.railMarker} /> : null}
                    <CategoryIcon icon={c.icon} size={24} color={active ? colors.accent : '#8E8E96'} />
                    <Text style={[styles.railText, active && styles.railTextActive]} numberOfLines={2}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
            {selected ? (
              <>
                <Text style={styles.panelTitle}>{selected.name}</Text>
                <Text style={styles.muted}>
                  {selected.productCount} part{selected.productCount === 1 ? '' : 's'} available
                </Text>

                <TouchableOpacity style={styles.shopAll} onPress={() => open(selected)} activeOpacity={0.85}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopAllTitle}>Shop all {selected.name}</Text>
                    <Text style={styles.shopAllSub}>Every part in this category</Text>
                  </View>
                  <View style={styles.shopAllArrow}>
                    <Ionicons name="arrow-forward" size={18} color={colors.black} />
                  </View>
                </TouchableOpacity>

                <Text style={styles.gridLabel}>BROWSE BY TYPE</Text>
                <View style={styles.grid}>
                  {selected.children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[styles.tile, { width: tileWidth }]}
                      onPress={() => open(child)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.tileIcon}>
                        <CategoryIcon slug={child.slug} icon={child.icon} size={26} color={colors.accent} />
                      </View>
                      <Text style={styles.tileTitle} numberOfLines={2}>
                        {child.name}
                      </Text>
                      <Text style={styles.tileCount}>
                        {child.productCount ? `${child.productCount} part${child.productCount === 1 ? '' : 's'}` : 'Coming soon'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.headerBg,
    paddingTop: HEADER_TOP,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  title: { color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.4, marginBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    height: 46,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  rail: { width: SIDEBAR, backgroundColor: colors.bg, borderRightWidth: 1, borderRightColor: colors.divider },
  railItem: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6, gap: 6 },
  railItemActive: { backgroundColor: colors.white },
  railMarker: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: colors.accent },
  railText: { fontSize: 11, textAlign: 'center', color: colors.textMuted, fontWeight: '600', lineHeight: 14 },
  railTextActive: { color: colors.accent, fontWeight: '800' },
  panelTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  shopAll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  shopAllTitle: { color: colors.white, fontWeight: '800', fontSize: 15 },
  shopAllSub: { color: '#A1A1AA', fontSize: 12, marginTop: 2 },
  shopAllArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'flex-start',
    minHeight: 124,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 17 },
  tileCount: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  searchTitle: { fontWeight: '700', fontSize: 15 },
});
