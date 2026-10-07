import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/theme';
import { SheetModal } from './SheetModal';
import { SRI_LANKA_DISTRICTS } from '../utils/format';

// Field-styled button that opens a list of Sri Lanka's 25 districts.
export function DistrictSelect({ value, onChange, error, label = 'District' }: { value: string; onChange: (d: string) => void; error?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.select, !!error && { borderColor: colors.accent }]} onPress={() => setOpen(true)}>
        <Text style={[styles.text, !value && { color: colors.textFaint }]}>{value || 'Select district'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <SheetModal visible={open} onClose={() => setOpen(false)} title="District">
        {SRI_LANKA_DISTRICTS.map((d) => (
          <TouchableOpacity
            key={d}
            style={styles.row}
            onPress={() => {
              onChange(d);
              setOpen(false);
            }}
          >
            <Text style={[styles.rowText, d === value && { color: colors.accent, fontWeight: '800' }]}>{d}</Text>
            {d === value ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
          </TouchableOpacity>
        ))}
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 50, backgroundColor: colors.white,
  },
  text: { fontSize: 15, color: colors.text },
  err: { color: colors.accent, fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowText: { fontSize: 16, color: colors.text },
});
