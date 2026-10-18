import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing, themed } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { Appointment } from '../../types';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { SheetModal } from '../../components/SheetModal';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ProductImage } from '../../components/ProductImage';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { appointmentStatus, appointmentWhen, serviceIcon } from '../../utils/services';

type Props = NativeStackScreenProps<RootStackParamList, 'Appointments'>;
type Action = 'accept' | 'decline' | 'complete' | 'cancel';

const ACTION_COPY: Record<Action, { title: string; button: string; placeholder: string; chips?: string[]; required?: boolean; done: string }> = {
  accept: { title: 'Accept appointment', button: 'Accept', placeholder: 'Anything the customer should know? (optional)', chips: ['See you then!', 'Please bring the service book.', 'Please arrive 10 minutes early.'], done: 'Appointment accepted. The customer has been told.' },
  decline: { title: 'Decline appointment', button: 'Decline', placeholder: 'Let the customer know why, or suggest another time', chips: ['Fully booked that day — please pick another day.', 'We can do the next morning instead.', 'We don’t do this type of work.'], required: true, done: 'Appointment declined.' },
  complete: { title: 'Mark as completed', button: 'Mark completed', placeholder: 'Note (optional)', done: 'Marked as completed.' },
  cancel: { title: 'Cancel appointment', button: 'Cancel appointment', placeholder: 'Reason (optional)', done: 'Appointment cancelled.' },
};

export function AppointmentsScreen({ route, navigation }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const isSeller = profile?.store?.status === 'APPROVED';
  const [as, setAs] = useState<'buyer' | 'seller'>(route.params?.as ?? (isSeller ? 'seller' : 'buyer'));
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<{ a: Appointment; action: Action } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    apiClient
      .get<Appointment[]>('/appointments', { params: { as } })
      .then(({ data }) => setItems(data))
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false));
  }, [as]);
  useFocusEffect(useCallback(() => void load(), [load]));

  const open = (a: Appointment, action: Action) => {
    setNote('');
    setSheet({ a, action });
  };
  const submit = async () => {
    if (!sheet) return;
    const copy = ACTION_COPY[sheet.action];
    if (copy.required && !note.trim()) {
      toast.info('Please add a short reason.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.post<Appointment>(`/appointments/${sheet.a.id}/${sheet.action}`, { note: note.trim() || undefined });
      setItems((list) => list?.map((x) => (x.id === data.id ? data : x)) ?? null);
      toast.success(copy.done);
      setSheet(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  // Upcoming first (soonest at the top), then the rest newest first.
  const sorted = (items ?? []).slice().sort((x, y) => {
    const ux = isUpcoming(x), uy = isUpcoming(y);
    if (ux !== uy) return ux ? -1 : 1;
    const dx = new Date(x.scheduledAt).getTime(), dy = new Date(y.scheduledAt).getTime();
    return ux ? dx - dy : dy - dx;
  });
  const pending = (items ?? []).filter((a) => a.status === 'REQUESTED' && !a.expired).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Appointments" back>
        {isSeller ? (
          <View style={styles.segment}>
            {(['seller', 'buyer'] as const).map((k) => (
              <TouchableOpacity key={k} style={[styles.segBtn, as === k && styles.segOn]} onPress={() => { setItems(null); setAs(k); }}>
                <Text style={[styles.segText, as === k && styles.segTextOn]}>{k === 'seller' ? 'Customer requests' : 'My bookings'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </Header>

      {items === null ? (
        failed ? (
          <EmptyState icon="cloud-offline-outline" title="Can’t load appointments" actionLabel="Try again" onAction={load} />
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 50 }} />
        )
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            as === 'seller' && pending ? (
              <View style={styles.banner}>
                <Ionicons name="notifications" size={18} color={colors.warning} />
                <Text style={styles.bannerText}>{pending} request{pending === 1 ? '' : 's'} waiting for your reply</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            as === 'seller' ? (
              <EmptyState icon="calendar-outline" title="No requests yet" message="When customers book one of your services, the requests show up here." actionLabel="My services" onAction={() => navigation.navigate('SellerServices')} />
            ) : (
              <EmptyState icon="calendar-outline" title="No appointments yet" message="Find a garage, service station or electrician and book a time that suits you." actionLabel="Browse services" onAction={() => navigation.navigate('Main', { screen: 'Services' })} />
            )
          }
          renderItem={({ item: a }) => {
            const st = appointmentStatus(a);
            const upcoming = isUpcoming(a);
            return (
              <View style={[styles.card, !upcoming && { opacity: 0.85 }]}>
                <View style={styles.top}>
                  <View style={[styles.status, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon} size={12} color={st.fg} />
                    <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                  <Text style={styles.when}>{appointmentWhen(a.scheduledAt)}</Text>
                </View>
                <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ServiceDetail', { serviceId: a.service.id })} activeOpacity={0.8}>
                  {a.service.image ? (
                    <ProductImage url={a.service.image} style={styles.thumb} rounded={10} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbIcon]}>
                      <Ionicons name={serviceIcon(a.service.type.icon)} size={22} color={colors.accent} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{a.service.title}</Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {a.viewerIsSeller ? `Customer: ${a.buyer.fullName}` : a.store.name}
                      {a.vehicle ? ` · ${a.vehicle}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
                {a.note ? <Text style={styles.note}>“{a.note}”</Text> : null}
                {a.sellerNote ? (
                  <View style={styles.reply}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.replyText}>{a.viewerIsSeller ? 'Your note' : a.store.name}: {a.sellerNote}</Text>
                  </View>
                ) : null}
                {!a.viewerIsSeller && a.store.address && a.status === 'ACCEPTED' ? (
                  <View style={styles.reply}>
                    <Ionicons name="location" size={14} color={colors.accent} />
                    <Text style={styles.replyText}>{a.store.address}{a.store.city ? `, ${a.store.city}` : ''}</Text>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  {a.conversationId ? (
                    <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('ChatConversation', { conversationId: a.conversationId! })}>
                      <Ionicons name="chatbubbles-outline" size={16} color={colors.text} />
                      <Text style={styles.chatText}>Chat</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={{ flex: 1 }} />
                  {a.viewerIsSeller && a.status === 'REQUESTED' && !a.expired ? (
                    <>
                      <Button title="Decline" size="sm" variant="outline" onPress={() => open(a, 'decline')} />
                      <Button title="Accept" size="sm" icon="checkmark" onPress={() => open(a, 'accept')} />
                    </>
                  ) : null}
                  {a.viewerIsSeller && a.status === 'ACCEPTED' ? (
                    <>
                      <Button title="Cancel" size="sm" variant="ghost" onPress={() => open(a, 'cancel')} />
                      <Button title="Completed" size="sm" variant="dark" icon="flag-outline" onPress={() => open(a, 'complete')} />
                    </>
                  ) : null}
                  {!a.viewerIsSeller && (a.status === 'REQUESTED' || a.status === 'ACCEPTED') && upcoming ? (
                    <Button
                      title="Cancel"
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        Alert.alert('Cancel this appointment?', 'The provider will be told.', [
                          { text: 'Keep it', style: 'cancel' },
                          { text: 'Cancel appointment', style: 'destructive', onPress: () => open(a, 'cancel') },
                        ])
                      }
                    />
                  ) : null}
                  {!a.viewerIsSeller && (a.status === 'DECLINED' || a.expired) ? (
                    <Button title="Book again" size="sm" variant="soft" onPress={() => navigation.navigate('BookAppointment', { serviceId: a.service.id })} />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <SheetModal
        visible={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet ? ACTION_COPY[sheet.action].title : ''}
        footer={sheet ? <Button title={ACTION_COPY[sheet.action].button} onPress={submit} loading={saving} variant={sheet.action === 'accept' ? 'primary' : 'dark'} /> : null}
      >
        {sheet ? (
          <>
            <Text style={styles.sheetWhen}>{appointmentWhen(sheet.a.scheduledAt)}</Text>
            <Text style={styles.sheetSub}>{sheet.a.service.title}</Text>
            {ACTION_COPY[sheet.action].chips ? (
              <View style={styles.chips}>
                {ACTION_COPY[sheet.action].chips!.map((c) => (
                  <TouchableOpacity key={c} style={[styles.chip, note === c && styles.chipOn]} onPress={() => setNote(c)}>
                    <Text style={[styles.chipText, note === c && { color: colors.white }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <TextField label={ACTION_COPY[sheet.action].required ? 'Message to the customer' : 'Message'} optional={!ACTION_COPY[sheet.action].required} placeholder={ACTION_COPY[sheet.action].placeholder} value={note} onChangeText={setNote} multiline maxLength={500} />
            <Text style={styles.sheetHint}>This is also posted in your chat with the {sheet.a.viewerIsSeller ? 'customer' : 'provider'}.</Text>
          </>
        ) : null}
      </SheetModal>
    </View>
  );
}

function isUpcoming(a: Appointment) {
  return (a.status === 'REQUESTED' || a.status === 'ACCEPTED') && !a.expired && new Date(a.scheduledAt).getTime() > Date.now();
}

const styles = themed(() => StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, padding: 4, marginTop: spacing.md, gap: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segOn: { backgroundColor: colors.paper },
  segText: { color: '#C9C6C6', fontWeight: '700', fontSize: 13 },
  segTextOn: { color: colors.ink },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm },
  bannerText: { color: colors.warning, fontWeight: '800', fontSize: 13.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11.5, fontWeight: '800' },
  when: { fontSize: 13, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  thumb: { width: 48, height: 48 },
  thumbIcon: { backgroundColor: colors.accentSoft, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  note: { fontSize: 13, color: colors.text, marginTop: 10, fontStyle: 'italic', backgroundColor: colors.bg, borderRadius: 8, padding: 8 },
  reply: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 8 },
  replyText: { flex: 1, fontSize: 12.5, color: colors.text, lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 4 },
  chatText: { fontWeight: '700', color: colors.text, fontSize: 13.5 },
  sheetWhen: { fontSize: 18, fontWeight: '900', color: colors.text },
  sheetSub: { color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.link },
  chipText: { fontSize: 12.5, color: colors.text, fontWeight: '600' },
  sheetHint: { color: colors.textMuted, fontSize: 12 },
}));
