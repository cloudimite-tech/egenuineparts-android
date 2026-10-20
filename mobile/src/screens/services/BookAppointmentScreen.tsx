import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing, themed } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { ServiceListing } from '../../types';
import { Header } from '../../components/Header';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { useVehicleStore, vehicleLabel } from '../../store/vehicleStore';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { durationLabel, priceRange } from '../../utils/services';

type Props = NativeStackScreenProps<RootStackParamList, 'BookAppointment'>;

const DAYS = 30;
// 8:00 am - 6:00 pm in 30-minute steps.
const SLOTS = Array.from({ length: 21 }, (_, i) => ({ h: 8 + Math.floor(i / 2), m: (i % 2) * 30 }));
const MIN_NOTICE_MS = 45 * 60 * 1000;

function slotLabel(h: number, m: number) {
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m === 0 ? '00' : m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function BookAppointmentScreen({ route, navigation }: Props) {
  const { serviceId } = route.params;
  const insets = useSafeAreaInsets();
  const myVehicle = useVehicleStore((s) => s.vehicle);
  const [service, setService] = useState<ServiceListing | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<{ h: number; m: number } | null>(null);
  const [vehicle, setVehicle] = useState(myVehicle ? vehicleLabel(myVehicle) : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get<ServiceListing>(`/services/${serviceId}`).then(({ data }) => setService(data)).catch(() => {});
  }, [serviceId]);

  const days = useMemo(() => {
    const out: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < DAYS; i++) out.push(new Date(base.getTime() + i * 864e5));
    return out;
  }, []);
  const day = days[dayIdx];
  const at = (s: { h: number; m: number }) => {
    const d = new Date(day);
    d.setHours(s.h, s.m, 0, 0);
    return d;
  };
  const free = SLOTS.filter((s) => at(s).getTime() > Date.now() + MIN_NOTICE_MS);
  // Today may be fully past - jump to tomorrow automatically.
  useEffect(() => {
    if (dayIdx === 0 && free.length === 0) setDayIdx(1);
  }, []);

  const submit = async () => {
    if (!slot) {
      toast.info('Pick a time first.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/services/${serviceId}/appointments`, { scheduledAt: at(slot).toISOString(), vehicle: vehicle.trim() || undefined, note: note.trim() || undefined });
      toast.success('Request sent. You’ll be notified when the provider replies.');
      navigation.replace('Appointments', { as: 'buyer' });
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t send the request.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Book an appointment" subtitle={service?.store.name} back />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {service ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle} numberOfLines={2}>{service.title}</Text>
            <Text style={styles.summarySub}>
              {priceRange(service.priceFrom, service.priceTo)}
              {durationLabel(service.durationMinutes) ? ` · ${durationLabel(service.durationMinutes)}` : ''}
            </Text>
          </View>
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
        )}

        <Text style={styles.label}>Day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {days.map((d, i) => {
            const on = i === dayIdx;
            const pastAll = i === 0 && free.length === 0 && dayIdx !== 0;
            return (
              <TouchableOpacity key={i} disabled={pastAll} style={[styles.day, on && styles.dayOn, pastAll && { opacity: 0.35 }]} onPress={() => { setDayIdx(i); setSlot(null); }}>
                <Text style={[styles.dayW, on && styles.onText]}>{i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</Text>
                <Text style={[styles.dayN, on && styles.onText]}>{d.getDate()}</Text>
                <Text style={[styles.dayM, on && styles.onText]}>{d.toLocaleDateString('en-GB', { month: 'short' })}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Time</Text>
        {free.length === 0 ? (
          <Text style={styles.muted}>No times left today - pick another day.</Text>
        ) : (
          <View style={styles.slots}>
            {SLOTS.map((s) => {
              const ok = at(s).getTime() > Date.now() + MIN_NOTICE_MS;
              const on = !!slot && slot.h === s.h && slot.m === s.m;
              return (
                <TouchableOpacity key={`${s.h}:${s.m}`} disabled={!ok} style={[styles.slot, on && styles.dayOn, !ok && { opacity: 0.3 }]} onPress={() => setSlot(s)}>
                  <Text style={[styles.slotText, on && styles.onText]}>{slotLabel(s.h, s.m)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <Text style={styles.muted}>This is a request - the provider confirms if they’re free, or you can agree another time in the chat.</Text>

        <View style={{ marginTop: spacing.lg }}>
          <TextField label="Vehicle" optional placeholder="e.g. Toyota Axio 2016" value={vehicle} onChangeText={setVehicle} maxLength={120} icon="car-sport-outline" />
          <TextField label="What do you need?" optional placeholder="Describe the problem or the work you want done" value={note} onChangeText={setNote} multiline maxLength={500} />
          <View style={styles.privacy}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.info} />
            <Text style={styles.privacyText}>Don’t add phone numbers or links - the provider replies in AutoGuide chat.</Text>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabel}>{slot ? at(slot).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'No time selected'}</Text>
          <Text style={styles.barValue}>{slot ? slotLabel(slot.h, slot.m) : 'Pick a day and time'}</Text>
        </View>
        <Button title="Send request" icon="send" onPress={submit} loading={saving} disabled={!slot} style={{ flex: 1 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  summarySub: { color: colors.textMuted, marginTop: 3, fontSize: 13 },
  label: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  day: { width: 62, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dayOn: { backgroundColor: colors.navy, borderColor: colors.link },
  dayW: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  dayN: { fontSize: 20, fontWeight: '900', color: colors.text, marginVertical: 1 },
  dayM: { fontSize: 11, color: colors.textMuted },
  onText: { color: colors.white },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31%', flexGrow: 1, paddingVertical: 11, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  slotText: { fontWeight: '700', color: colors.text, fontSize: 13.5 },
  muted: { color: colors.textMuted, fontSize: 12.5, marginTop: spacing.sm, lineHeight: 18 },
  privacy: { flexDirection: 'row', gap: 8, backgroundColor: colors.infoSoft, borderRadius: radius.sm, padding: 10, alignItems: 'flex-start' },
  privacyText: { flex: 1, color: colors.info, fontSize: 12.5, lineHeight: 17 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  barLabel: { fontSize: 11.5, color: colors.textMuted },
  barValue: { fontSize: 16, fontWeight: '900', color: colors.text },
}));
