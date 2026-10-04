import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SheetModal } from './SheetModal';
import { TextField } from './TextField';
import { Button } from './Button';
import { colors, radius, spacing } from '../theme/theme';

export interface Filters {
  sort: string;
  minPrice: string;
  maxPrice: string;
  brands: string[];
}

export const DEFAULT_FILTERS: Filters = { sort: 'best_match', minPrice: '', maxPrice: '', brands: [] };

export const SORTS = [
  { key: 'best_match', label: 'Best match' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest first' },
];

export function activeFilterCount(f: Filters) {
  return (f.sort !== 'best_match' ? 1 : 0) + (f.minPrice || f.maxPrice ? 1 : 0) + (f.brands.length ? 1 : 0);
}

export function FilterSheet({
  visible,
  onClose,
  value,
  onApply,
  availableBrands,
}: {
  visible: boolean;
  onClose: () => void;
  value: Filters;
  onApply: (f: Filters) => void;
  availableBrands: string[];
}) {
  const [draft, setDraft] = useState<Filters>(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible]);

  const brands = Array.from(new Set([...availableBrands, ...draft.brands])).sort();
  const toggleBrand = (b: string) =>
    setDraft((d) => ({ ...d, brands: d.brands.includes(b) ? d.brands.filter((x) => x !== b) : [...d.brands, b] }));

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Filter & sort"
      right={
        <TouchableOpacity onPress={() => setDraft(DEFAULT_FILTERS)}>
          <Text style={styles.reset}>Reset</Text>
        </TouchableOpacity>
      }
      footer={
        <Button
          title="Show results"
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
      }
    >
      <Text style={styles.label}>SORT BY</Text>
      {SORTS.map((s) => {
        const active = draft.sort === s.key;
        return (
          <TouchableOpacity key={s.key} style={styles.radioRow} onPress={() => setDraft((d) => ({ ...d, sort: s.key }))}>
            <Text style={[styles.radioText, active && { fontWeight: '700' }]}>{s.label}</Text>
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.accent : colors.textFaint} />
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.label, { marginTop: spacing.lg }]}>PRICE (RS.)</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <TextField placeholder="Min" keyboardType="number-pad" value={draft.minPrice} onChangeText={(v) => setDraft((d) => ({ ...d, minPrice: v.replace(/\D/g, '') }))} />
        </View>
        <Text style={{ marginBottom: spacing.md, color: colors.textMuted }}>—</Text>
        <View style={{ flex: 1 }}>
          <TextField placeholder="Max" keyboardType="number-pad" value={draft.maxPrice} onChangeText={(v) => setDraft((d) => ({ ...d, maxPrice: v.replace(/\D/g, '') }))} />
        </View>
      </View>

      {brands.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: spacing.sm }]}>BRAND</Text>
          <View style={styles.brandGrid}>
            {brands.map((b) => {
              const on = draft.brands.includes(b);
              return (
                <TouchableOpacity key={b} style={[styles.brandChip, on && styles.brandChipOn]} onPress={() => toggleBrand(b)}>
                  {on ? <Ionicons name="checkmark" size={14} color={colors.accent} /> : null}
                  <Text style={[styles.brandText, on && { color: colors.accent }]}>{b}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  reset: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: colors.textMuted, marginBottom: spacing.sm },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  radioText: { fontSize: 15, color: colors.text },
  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  brandChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  brandText: { fontWeight: '600', color: colors.text },
});
