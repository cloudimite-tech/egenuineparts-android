import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Vehicle } from '../types';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { SheetModal } from '../components/SheetModal';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { useVehicleStore, vehicleLabel } from '../store/vehicleStore';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'Garage'>;

export function GarageScreen({ navigation }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ make: '', model: '', year: '', engine: '', chassisCode: '' });
  const [saving, setSaving] = useState(false);
  const { vehicle: shoppingFor, setVehicle } = useVehicleStore();

  const load = useCallback(() => {
    apiClient.get<Vehicle[]>('/vehicles').then((r) => setVehicles(r.data)).catch(() => setVehicles([]));
  }, []);
  useFocusEffect(load);

  const save = async () => {
    const year = Number(form.year);
    if (!form.make.trim() || !form.model.trim() || !year) {
      toast.error('Make, model and year are required.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/vehicles', {
        make: form.make.trim(),
        model: form.model.trim(),
        year,
        engine: form.engine.trim() || undefined,
        chassisCode: form.chassisCode.trim() || undefined,
      });
      if (!shoppingFor) setVehicle({ make: form.make.trim(), model: form.model.trim(), year });
      setForm({ make: '', model: '', year: '', engine: '', chassisCode: '' });
      setAdding(false);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (v: Vehicle) => {
    const { data } = await apiClient.patch<Vehicle[]>(`/vehicles/${v.id}/default`);
    setVehicles(data);
  };

  const remove = (v: Vehicle) =>
    Alert.alert('Remove vehicle?', vehicleLabel(v), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await apiClient.delete(`/vehicles/${v.id}`);
          load();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="My garage" back right={<TouchableOpacity onPress={() => setAdding(true)}><Ionicons name="add" size={28} color={colors.white} /></TouchableOpacity>} />
      {!vehicles ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon="car-sport-outline"
          title="No vehicles yet"
          message="Save your vehicles to instantly see which parts fit."
          actionLabel="Add a vehicle"
          onAction={() => setAdding(true)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {vehicles.map((v) => {
            const active = !!shoppingFor && shoppingFor.make === v.make && shoppingFor.model === v.model && shoppingFor.year === v.year;
            return (
              <View key={v.id} style={[styles.card, v.isDefault && styles.cardDefault]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.icon}>
                    <Ionicons name="car-sport" size={24} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {v.isDefault ? <Text style={styles.default}>DEFAULT</Text> : null}
                    <Text style={styles.name}>{vehicleLabel(v)}</Text>
                    {v.engine || v.chassisCode ? (
                      <Text style={styles.sub}>{[v.engine, v.chassisCode].filter(Boolean).join(' · ')}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => remove(v)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.actions}>
                  <Button
                    title={active ? 'Shopping for this' : 'Shop for this'}
                    size="sm"
                    variant={active ? 'soft' : 'dark'}
                    icon={active ? 'checkmark' : undefined}
                    onPress={() => {
                      setVehicle({ make: v.make, model: v.model, year: v.year });
                      navigation.navigate('Main', { screen: 'Home' });
                    }}
                    style={{ flex: 1 }}
                  />
                  {!v.isDefault ? (
                    <Button title="Make default" size="sm" variant="outline" onPress={() => makeDefault(v)} style={{ flex: 1 }} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <SheetModal
        visible={adding}
        onClose={() => setAdding(false)}
        title="Add a vehicle"
        footer={<Button title="Save vehicle" onPress={save} loading={saving} />}
      >
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField label="Make" placeholder="Toyota" value={form.make} onChangeText={(t) => setForm((f) => ({ ...f, make: t }))} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Model" placeholder="Axio" value={form.model} onChangeText={(t) => setForm((f) => ({ ...f, model: t }))} />
          </View>
        </View>
        <TextField label="Year" placeholder="2016" keyboardType="number-pad" maxLength={4} value={form.year} onChangeText={(t) => setForm((f) => ({ ...f, year: t }))} />
        <TextField label="Engine" optional placeholder="1.5 L Hybrid" value={form.engine} onChangeText={(t) => setForm((f) => ({ ...f, engine: t }))} />
        <TextField label="Chassis code" optional placeholder="NZE161" autoCapitalize="characters" value={form.chassisCode} onChangeText={(t) => setForm((f) => ({ ...f, chassisCode: t }))} hint="Helps sellers confirm exact fitment." />
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4, borderWidth: 1.5, borderColor: 'transparent' },
  cardDefault: { borderColor: colors.navy },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  default: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  name: { fontWeight: '800', fontSize: 17 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
