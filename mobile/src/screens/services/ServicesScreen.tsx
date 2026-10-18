import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from '../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, HEADER_TOP, radius, spacing, themed } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { ServiceListing, ServiceType } from '../../types';
import { GradientHeader } from '../../components/GradientHeader';
import { EmptyState } from '../../components/EmptyState';
import { ServiceCard } from '../../components/ServiceCard';
import { serviceIcon } from '../../utils/services';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Services'>, NativeStackScreenProps<RootStackParamList>>;

const RAIL = 92;

// Same layout as Product Categories: service types on the left, the
// providers for the selected type on the right.
export function ServicesScreen({ navigation, route }: Props) {
  const [types, setTypes] = useState<ServiceType[] | null>(null);
  const [selected, setSelected] = useState<string | null>(route.params?.type ?? null);
  const [items, setItems] = useState<ServiceListing[] | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<ScrollView>(null);

  const loadTypes = useCallback(() => {
    setFailed(false);
    apiClient
      .get<ServiceType[]>('/service-types')
      .then(({ data }) => {
        setTypes(data);
        setSelected((cur) => (cur && data.some((t) => t.slug === cur) ? cur : data[0]?.slug ?? null));
      })
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false));
  }, []);
  useEffect(loadTypes, [loadTypes]);
  useEffect(() => {
    if (route.params?.type) setSelected(route.params.type);
  }, [route.params?.type]);

  const loadItems = useCallback(() => {
    if (!query && !selected) return;
    setItems(null);
    apiClient
      .get<ServiceListing[]>('/services', { params: query ? { q: query } : { type: selected } })
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
  }, [selected, query]);
  useEffect(() => {
    loadItems();
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, [loadItems]);

  const current = types?.find((t) => t.slug === selected);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <GradientHeader style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search garages and services"
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              if (!t) setQuery('');
            }}
            returnKeyType="search"
            onSubmitEditing={() => setQuery(search.trim())}
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); setQuery(''); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      </GradientHeader>

      {types === null ? (
        failed ? (
          <EmptyState icon="cloud-offline-outline" title="Can’t load services" actionLabel="Try again" onAction={loadTypes} />
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
        )
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {!query ? (
            <View style={styles.rail}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {types.map((t) => {
                  const active = t.slug === selected;
                  return (
                    <TouchableOpacity key={t.id} style={[styles.railItem, active && styles.railItemActive]} onPress={() => setSelected(t.slug)}>
                      {active ? <View style={styles.railMarker} /> : null}
                      <Ionicons name={serviceIcon(t.icon)} size={24} color={active ? colors.accent : colors.textFaint} />
                      <Text style={[styles.railText, active && styles.railTextActive]} numberOfLines={2}>
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <ScrollView
            ref={listRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); loadTypes(); loadItems(); }} />}
          >
            {query ? (
              <>
                <Text style={styles.panelTitle}>Results for “{query}”</Text>
                <Text style={styles.muted}>{items ? `${items.length} service${items.length === 1 ? '' : 's'}` : 'Searching…'}</Text>
              </>
            ) : current ? (
              <>
                <Text style={styles.panelTitle}>{current.name}</Text>
                {current.description ? <Text style={styles.muted}>{current.description}</Text> : null}
                <TouchableOpacity style={styles.allBtn} onPress={() => navigation.navigate('ServiceList', { type: current.slug, typeName: current.name })} activeOpacity={0.85}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allTitle}>Filter by district</Text>
                    <Text style={styles.allSub}>See {current.name.toLowerCase()} near you</Text>
                  </View>
                  <View style={styles.allArrow}>
                    <Ionicons name="location" size={16} color={colors.ink} />
                  </View>
                </TouchableOpacity>
              </>
            ) : null}

            <View style={{ marginTop: spacing.md }}>
              {items === null ? (
                <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
              ) : items.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name={query ? 'search' : serviceIcon(current?.icon)} size={28} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>{query ? 'No services found' : 'No providers yet'}</Text>
                  <Text style={styles.muted}>{query ? 'Try a different word.' : 'Verified providers in this category will show up here.'}</Text>
                </View>
              ) : (
                items.map((s) => <ServiceCard key={s.id} compact service={s} onPress={() => navigation.navigate('ServiceDetail', { serviceId: s.id })} />)
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  header: { paddingTop: HEADER_TOP, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 3, borderBottomColor: colors.accent },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.4, marginBottom: spacing.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, height: 46, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  rail: { width: RAIL, backgroundColor: colors.bg, borderRightWidth: 1, borderRightColor: colors.divider },
  railItem: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6, gap: 6 },
  railItemActive: { backgroundColor: colors.surface },
  railMarker: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: colors.accent },
  railText: { fontSize: 11, textAlign: 'center', color: colors.textMuted, fontWeight: '600', lineHeight: 14 },
  railTextActive: { color: colors.accent, fontWeight: '800' },
  panelTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  allBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navy, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  allTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  allSub: { color: '#A1A1AA', fontSize: 12, marginTop: 2 },
  allArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
}));
