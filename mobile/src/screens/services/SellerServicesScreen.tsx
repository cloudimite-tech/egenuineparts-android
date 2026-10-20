import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing, themed } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { ServiceListing, ServiceTypeRequest } from '../../types';
import { Header, HeaderIconButton } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { ServiceCard } from '../../components/ServiceCard';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { timeAgo } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerServices'>;
type Summary = { pendingAppointments: number; upcomingAppointments: number; services: number };

export function SellerServicesScreen({ navigation }: Props) {
  const [items, setItems] = useState<ServiceListing[] | null>(null);
  const [requests, setRequests] = useState<ServiceTypeRequest[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([
      apiClient.get<ServiceListing[]>('/services/mine'),
      apiClient.get<ServiceTypeRequest[]>('/service-types/requests/mine'),
      apiClient.get<Summary>('/services/mine/summary'),
    ])
      .then(([a, b, c]) => {
        setItems(a.data);
        setRequests(b.data);
        setSummary(c.data);
      })
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false));
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  const remove = (s: ServiceListing) =>
    Alert.alert('Remove this service?', `“${s.title}” will no longer be shown to customers. Past appointments stay in your history.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/services/${s.id}`);
            setItems((l) => l?.filter((x) => x.id !== s.id) ?? null);
            toast.success('Service removed.');
          } catch (e) {
            toast.error(errorMessage(e));
          }
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="My services" subtitle="Garage, service station and other work you offer" back right={<HeaderIconButton icon="add-circle-outline" onPress={() => navigation.navigate('ServiceForm')} />} />
      {items === null ? (
        failed ? (
          <EmptyState icon="cloud-offline-outline" title="Can’t load your services" actionLabel="Try again" onAction={load} />
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 50 }} />
        )
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <TouchableOpacity style={styles.apptCard} onPress={() => navigation.navigate('Appointments', { as: 'seller' })} activeOpacity={0.85}>
            <View style={styles.apptIcon}>
              <Ionicons name="calendar" size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.apptTitle}>Appointment requests</Text>
              <Text style={styles.apptSub}>
                {summary?.pendingAppointments ? `${summary.pendingAppointments} waiting for your reply` : 'No new requests'}
                {summary?.upcomingAppointments ? ` · ${summary.upcomingAppointments} upcoming` : ''}
              </Text>
            </View>
            {summary?.pendingAppointments ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{summary.pendingAppointments}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={20} color={colors.white} />
          </TouchableOpacity>

          {items.length === 0 ? (
            <EmptyState
              icon="construct-outline"
              title="Offer your services"
              message="Run a garage, service station or auto electrical shop? Add your services so customers can find you and book appointments."
              actionLabel="Add a service"
              onAction={() => navigation.navigate('ServiceForm')}
            />
          ) : (
            <>
              <Text style={styles.section}>LIVE SERVICES · {items.length}</Text>
              {items.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onPress={() => navigation.navigate('ServiceForm', { serviceId: s.id })}
                  right={
                    <TouchableOpacity onPress={() => remove(s)} hitSlop={10} style={{ alignSelf: 'flex-start' }} accessibilityLabel="Remove service">
                      <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
                    </TouchableOpacity>
                  }
                />
              ))}
              <TouchableOpacity style={styles.add} onPress={() => navigation.navigate('ServiceForm')}>
                <Ionicons name="add" size={20} color={colors.accent} />
                <Text style={styles.addText}>Add another service</Text>
              </TouchableOpacity>
            </>
          )}

          {requests.length ? (
            <>
              <Text style={[styles.section, { marginTop: spacing.lg }]}>SERVICE TYPES YOU ASKED FOR</Text>
              <View style={styles.reqBox}>
                {requests.map((r, i) => (
                  <View key={r.id} style={[styles.req, i < requests.length - 1 && styles.reqBorder]}>
                    <Ionicons
                      name={r.status === 'APPROVED' ? 'checkmark-circle' : r.status === 'DECLINED' ? 'close-circle' : 'time'}
                      size={20}
                      color={r.status === 'APPROVED' ? colors.success : r.status === 'DECLINED' ? colors.accent : colors.warning}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reqName}>{r.name}</Text>
                      <Text style={styles.reqSub}>
                        {r.status === 'PENDING' ? `Waiting for AutoGuide · sent ${timeAgo(r.createdAt)}` : r.status === 'APPROVED' ? 'Added - you can choose it now' : 'Not added'}
                      </Text>
                      {r.reviewNote ? <Text style={styles.reqNote}>{r.reviewNote}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  apptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.navy, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  apptIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  apptTitle: { color: colors.white, fontWeight: '800', fontSize: 15 },
  apptSub: { color: '#BDB9B9', fontSize: 12.5, marginTop: 2 },
  badge: { backgroundColor: colors.accent, borderRadius: 999, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  badgeText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textMuted, marginBottom: spacing.sm },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, marginTop: 4 },
  addText: { color: colors.accent, fontWeight: '800' },
  reqBox: { backgroundColor: colors.surface, borderRadius: radius.md, ...shadow },
  req: { flexDirection: 'row', gap: 10, padding: spacing.md, alignItems: 'flex-start' },
  reqBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  reqName: { fontWeight: '800', color: colors.text, fontSize: 14.5 },
  reqSub: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  reqNote: { color: colors.text, fontSize: 12.5, marginTop: 4, fontStyle: 'italic' },
}));
