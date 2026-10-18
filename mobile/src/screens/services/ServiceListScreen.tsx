import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from '../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing, themed } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { ServiceListing, ServiceType } from '../../types';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { ServiceCard } from '../../components/ServiceCard';
import { SheetModal } from '../../components/SheetModal';
import { SRI_LANKA_DISTRICTS } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceList'>;

export function ServiceListScreen({ route, navigation }: Props) {
  const p = route.params ?? {};
  const [type, setType] = useState<string | undefined>(p.type);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [q, setQ] = useState(p.q ?? '');
  const [query, setQuery] = useState(p.q ?? '');
  const [district, setDistrict] = useState('');
  const [items, setItems] = useState<ServiceListing[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);

  useEffect(() => {
    apiClient.get<ServiceType[]>('/service-types').then(({ data }) => setTypes(data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setFailed(false);
    apiClient
      .get<ServiceListing[]>('/services', { params: { type: type || undefined, q: query || undefined, district: district || undefined, store: p.store } })
      .then(({ data }) => setItems(data))
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false));
  }, [type, query, district, p.store]);
  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  const typeName = types.find((t) => t.slug === type)?.name ?? p.typeName;
  const title = p.storeName ? `Services · ${p.storeName}` : typeName ?? 'Services';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={title} subtitle="Book with verified providers" back>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services or garages"
            placeholderTextColor={colors.textFaint}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
            onSubmitEditing={() => setQuery(q.trim())}
          />
          {q ? (
            <TouchableOpacity onPress={() => { setQ(''); setQuery(''); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Header>

      {!p.store ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <TouchableOpacity style={[styles.chip, styles.districtChip, !!district && styles.chipOn]} onPress={() => setDistrictOpen(true)} activeOpacity={0.8}>
              <Ionicons name="location" size={13} color={district ? colors.white : colors.accent} />
              <Text style={[styles.chipText, !!district && styles.chipTextOn]}>{district || 'Any district'}</Text>
              <Ionicons name="chevron-down" size={13} color={district ? colors.white : colors.textMuted} />
            </TouchableOpacity>
            <Chip label="All services" active={!type} onPress={() => setType(undefined)} />
            {types.map((t) => (
              <Chip key={t.id} label={t.name} active={type === t.slug} onPress={() => setType(t.slug)} />
            ))}
          </ScrollView>
          <SheetModal visible={districtOpen} onClose={() => setDistrictOpen(false)} title="District">
            {['', ...SRI_LANKA_DISTRICTS].map((d) => (
              <TouchableOpacity key={d || 'any'} style={styles.dRow} onPress={() => { setDistrict(d); setDistrictOpen(false); }}>
                <Text style={[styles.dText, d === district && { color: colors.accent, fontWeight: '800' }]}>{d || 'Any district'}</Text>
                {d === district ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
              </TouchableOpacity>
            ))}
          </SheetModal>
        </View>
      ) : null}

      {items === null ? (
        failed ? (
          <EmptyState icon="cloud-offline-outline" title="Can’t load services" actionLabel="Try again" onAction={load} />
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 50 }} />
        )
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={items.length ? <Text style={styles.count}>{items.length} service{items.length === 1 ? '' : 's'}{district ? ` in ${district}` : ''}</Text> : null}
          ListEmptyComponent={
            <EmptyState
              icon="construct-outline"
              title="No services yet"
              message={query || district ? 'Try another search or district.' : 'Verified providers will appear here soon.'}
            />
          }
          renderItem={({ item }) => <ServiceCard service={item} onPress={() => navigation.push('ServiceDetail', { serviceId: item.id })} />}
        />
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipOn]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = themed(() => StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, height: 44, paddingHorizontal: 14, marginTop: spacing.md },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  chips: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.link },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  chipTextOn: { color: colors.white },
  districtChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  dText: { flex: 1, fontSize: 15, color: colors.text },
  count: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600', marginBottom: spacing.sm },
}));
