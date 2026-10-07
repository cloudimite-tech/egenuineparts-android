import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SheetModal } from './SheetModal';
import { TextField } from './TextField';
import { Button } from './Button';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { SelectedVehicle, useVehicleStore, vehicleLabel } from '../store/vehicleStore';
import { Vehicle } from '../types';

const POPULAR: SelectedVehicle[] = [
  { make: 'Toyota', model: 'Axio', year: 2016 },
  { make: 'Toyota', model: 'Aqua', year: 2015 },
  { make: 'Honda', model: 'Vezel', year: 2018 },
  { make: 'Honda', model: 'Fit', year: 2017 },
  { make: 'Toyota', model: 'Premio', year: 2014 },
];

export function VehiclePickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { isGuest } = useAuthStore();
  const { vehicle, setVehicle } = useVehicleStore();
  const [garage, setGarage] = useState<Vehicle[]>([]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || isGuest) return;
    apiClient.get<Vehicle[]>('/vehicles').then((r) => setGarage(r.data)).catch(() => {});
  }, [visible, isGuest]);

  const choose = (v: SelectedVehicle | null) => {
    setVehicle(v);
    onClose();
  };

  const useTyped = () => {
    const y = Number(year);
    if (!make.trim() || !model.trim() || !y || y < 1980 || y > new Date().getFullYear() + 1) {
      setError('Enter make, model and a valid year.');
      return;
    }
    setError(null);
    choose({ make: capitalize(make), model: capitalize(model), year: y });
    setMake('');
    setModel('');
    setYear('');
  };

  const isSelected = (v: SelectedVehicle) =>
    !!vehicle && vehicle.make === v.make && vehicle.model === v.model && vehicle.year === v.year;

  return (
    <SheetModal visible={visible} onClose={onClose} title="Shopping for">
      <Text style={styles.lead}>We’ll show parts that fit, and flag the ones that don’t.</Text>

      {garage.length > 0 && (
        <>
          <Text style={styles.label}>MY GARAGE</Text>
          {garage.map((v) => (
            <Row
              key={v.id}
              title={vehicleLabel(v)}
              subtitle={[v.engine, v.chassisCode].filter(Boolean).join(' · ') || undefined}
              selected={isSelected(v)}
              onPress={() => choose({ make: v.make, model: v.model, year: v.year })}
            />
          ))}
        </>
      )}

      <Text style={styles.label}>POPULAR IN SRI LANKA</Text>
      <View style={styles.chips}>
        {POPULAR.map((v) => (
          <TouchableOpacity
            key={vehicleLabel(v)}
            style={[styles.chip, isSelected(v) && styles.chipActive]}
            onPress={() => choose(v)}
          >
            <Text style={[styles.chipText, isSelected(v) && { color: colors.white }]}>{vehicleLabel(v)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>ANOTHER VEHICLE</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <TextField placeholder="Make" value={make} onChangeText={setMake} autoCapitalize="words" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField placeholder="Model" value={model} onChangeText={setModel} autoCapitalize="words" />
        </View>
        <View style={{ width: 84 }}>
          <TextField placeholder="Year" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Use this vehicle" onPress={useTyped} variant="dark" />
      {vehicle ? (
        <Button title="Show all parts (clear vehicle)" variant="ghost" onPress={() => choose(null)} style={{ marginTop: 4 }} />
      ) : null}
    </SheetModal>
  );
}

function Row({ title, subtitle, selected, onPress }: { title: string; subtitle?: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.row, selected && styles.rowActive]} onPress={onPress}>
      <Ionicons name="car-sport-outline" size={22} color={selected ? colors.accent : colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
    </TouchableOpacity>
  );
}

const capitalize = (s: string) => s.trim().replace(/\b\w/g, (c) => c.toUpperCase());

const styles = StyleSheet.create({
  lead: { color: colors.textMuted, marginBottom: spacing.md },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  rowTitle: { fontWeight: '700', fontSize: 15 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontWeight: '600', fontSize: 13, color: colors.text },
  error: { color: colors.accent, marginBottom: spacing.sm, marginTop: -8 },
});
