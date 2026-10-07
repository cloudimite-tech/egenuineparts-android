import React, { useCallback, useState } from 'react';
import { useNoScreenshots } from '../../utils/useNoScreenshots';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { API_BASE_URL } from '../../api/config';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { SheetModal } from '../../components/SheetModal';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { AdminSellerDetail } from '../../types';
import { SellerStatusPill } from './SellerStatusPill';
import { LocationMap } from '../../components/LocationMap';
import { AdminDoc } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSellerDetail'>;

const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const addr = (a: { addressLine1?: string | null; addressLine2?: string | null; city?: string | null; district?: string | null } | null | undefined) =>
  a ? [a.addressLine1, a.addressLine2, a.city, a.district ? `${a.district} District` : null].filter(Boolean).join(', ') : '—';

export function AdminSellerDetailScreen({ route, navigation }: Props) {
  useNoScreenshots('admin-seller');
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AdminSellerDetail | null>(null);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');

  // Reloaded on focus so the short-lived document link is always fresh.
  const load = useCallback(() => {
    apiClient.get<AdminSellerDetail>(`/admin/sellers/${id}`).then(({ data }) => setData(data)).catch((e) => toast.error(errorMessage(e)));
  }, [id]);
  useFocusEffect(load);


  const approve = () =>
    Alert.alert('Approve this seller?', `${data?.storeName} will go live and can start listing parts.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setBusy('approve');
          try {
            const { data: d } = await apiClient.post<AdminSellerDetail>(`/admin/sellers/${id}/approve`, {});
            setData(d);
            toast.success('Seller approved');
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  const reject = async () => {
    if (note.trim().length < 5) {
      toast.error('Write a short reason for the seller');
      return;
    }
    setBusy('reject');
    try {
      const { data: d } = await apiClient.post<AdminSellerDetail>(`/admin/sellers/${id}/reject`, { note: note.trim() });
      setData(d);
      setRejectOpen(false);
      setNote('');
      toast.success(d.status === 'SUSPENDED' ? 'Store suspended' : 'Application rejected');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Seller application" back />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      </View>
    );
  }

  const isApproved = data.status === 'APPROVED';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={data.storeName} subtitle={data.businessName ?? undefined} back />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }}>
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}>
          <SellerStatusPill status={data.status} />
          <Text style={styles.muted}>
            {data.status === 'PENDING' ? `Submitted ${when(data.submittedAt)}` : `${data.reviewedBy ?? 'Reviewed'} · ${when(data.reviewedAt)}`}
          </Text>
        </View>
        {data.reviewNote ? (
          <View style={[styles.card, { backgroundColor: colors.accentSoft }]}>
            <Text style={styles.overline}>NOTE SENT TO SELLER</Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>{data.reviewNote}</Text>
          </View>
        ) : null}

        <Section title="Owner identity">
          <Row label="NIC number" value={data.nicNumber} strong />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <DocTile label="NIC front" doc={data.nicFront} />
            <DocTile label="NIC back" doc={data.nicBack} />
          </View>
          <Text style={[styles.muted, { marginTop: 8, fontSize: 11 }]}>Check that the name and NIC number match the account owner below.</Text>
        </Section>

        <Section title="Business registration">
          <Row label="Registered name" value={data.businessName} />
          <Row label="BR number" value={data.brNumber} strong />
          <Row label="Business address" value={addr(data)} />
          <Row label="Business phone" value={data.contactPhone} last />
        </Section>

        <Section title="BR certificate">
          <DocTile label="Certificate" doc={data.document} large />
          <Text style={[styles.muted, { marginTop: 8, fontSize: 11 }]}>Check that the name and BR number match the details above.</Text>
        </Section>

        <Section title="Shop location">
          {data.latitude != null && data.longitude != null ? (
            <>
              <LocationMap
                value={{ lat: data.latitude, lng: data.longitude }}
                secondary={data.selfie?.latitude != null && data.selfie?.longitude != null ? { lat: data.selfie.latitude, lng: data.selfie.longitude } : null}
                height={220}
              />
              <Text style={[styles.muted, { marginTop: 6, fontSize: 11 }]}>Red pin: shop as pinned by the seller · Blue dot: where the selfie was taken</Text>
              <TouchableOpacity style={styles.mapsLink} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`)}>
                <Ionicons name="navigate-outline" size={16} color={colors.navy} />
                <Text style={styles.mapsLinkText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.muted}>No map location.</Text>
          )}
        </Section>

        <Section title="Selfie at the shop">
          <DocTile label="Selfie" doc={data.selfie} large />
          {data.selfie ? (
            <View style={[styles.selfieNote, { backgroundColor: selfieTone(data.selfie.distanceFromShopM).bg }]}>
              <Ionicons name={selfieTone(data.selfie.distanceFromShopM).icon} size={16} color={selfieTone(data.selfie.distanceFromShopM).fg} />
              <Text style={{ color: selfieTone(data.selfie.distanceFromShopM).fg, fontWeight: '700', flex: 1, fontSize: 12 }}>
                {data.selfie.distanceFromShopM == null
                  ? 'The phone didn’t share its location when this selfie was taken.'
                  : `Taken ${formatDistance(data.selfie.distanceFromShopM)} from the pinned shop`}
                {data.selfie.takenAt ? ` · ${when(data.selfie.takenAt)}` : ''}
              </Text>
            </View>
          ) : null}
        </Section>

        <Section title="Store (shown to buyers)">
          <Row label="Store name" value={data.storeName} />
          <Row label="About" value={data.bio} />
          <Row label="Live listings" value={String(data.productCount)} last />
        </Section>

        <Section title="Account owner">
          <Row label="Name" value={data.owner?.fullName} />
          <Row label="Email" value={data.owner?.email} />
          <Row label="Mobile" value={data.owner?.phone} />
          <Row label="Address" value={addr(data.owner)} />
          <Row label="Joined" value={when(data.owner?.createdAt)} last />
        </Section>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        {isApproved ? (
          <Button title="Suspend store" variant="outline" icon="ban-outline" onPress={() => setRejectOpen(true)} loading={busy === 'reject'} />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {data.status !== 'REJECTED' ? (
              <Button title="Reject" variant="outline" icon="close" onPress={() => setRejectOpen(true)} style={{ flex: 1 }} disabled={!!busy} />
            ) : null}
            <Button title={data.status === 'PENDING' ? 'Approve' : 'Approve now'} icon="checkmark" onPress={approve} loading={busy === 'approve'} style={{ flex: 1.4 }} disabled={!!busy} />
          </View>
        )}
      </View>

      <SheetModal
        visible={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={isApproved ? 'Suspend store' : 'Reject application'}
        footer={<Button title={isApproved ? 'Suspend & notify seller' : 'Reject & notify seller'} onPress={reject} loading={busy === 'reject'} />}
      >
        <Text style={[styles.muted, { marginBottom: spacing.md }]}>
          {isApproved
            ? 'The store’s listings will be hidden immediately. The seller sees this reason.'
            : 'The seller sees this reason and can fix their details and resubmit.'}
        </Text>
        <TextField label="Reason" placeholder="e.g. The BR number doesn’t match the certificate." value={note} onChangeText={setNote} multiline />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Certificate is unclear — please upload a clearer photo.', 'BR number doesn’t match the certificate.', 'Business name doesn’t match the certificate.'].map((q) => (
            <TouchableOpacity key={q} style={styles.chip} onPress={() => setNote(q)}>
              <Text style={styles.chipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SheetModal>
    </View>
  );
}

function selfieTone(m: number | null): { fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap } {
  if (m == null) return { fg: colors.warning, bg: colors.warningSoft, icon: 'help-circle-outline' };
  if (m <= 300) return { fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle-outline' };
  if (m <= 2000) return { fg: colors.warning, bg: colors.warningSoft, icon: 'alert-circle-outline' };
  return { fg: colors.accent, bg: colors.accentSoft, icon: 'warning-outline' };
}
const formatDistance = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

// Preview of one verification file (image inline, PDF as a tap-to-open card).
function DocTile({ label, doc, large }: { label: string; doc: AdminDoc | null; large?: boolean }) {
  if (!doc) {
    return (
      <View style={[styles.tile, { flex: 1, alignItems: 'center', justifyContent: 'center', height: large ? 120 : 110 }]}>
        <Text style={styles.muted}>No {label.toLowerCase()} uploaded</Text>
      </View>
    );
  }
  const url = `${API_BASE_URL}${doc.url}`;
  const isPdf = doc.mimeType === 'application/pdf';
  return (
    <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(url)} activeOpacity={0.85}>
      {isPdf ? (
        <View style={[styles.pdf, { height: large ? undefined : 110 }]}>
          <Ionicons name="document-attach-outline" size={28} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800' }} numberOfLines={1}>{doc.fileName}</Text>
            <Text style={styles.muted}>PDF · tap to open</Text>
          </View>
        </View>
      ) : (
        <Image source={{ uri: url }} style={[styles.docImage, { height: large ? 260 : 110 }]} resizeMode="contain" />
      )}
      <Text style={[styles.muted, { textAlign: 'center', marginTop: 4, fontSize: 11 }]}>{label} · tap to open</Text>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, strong, last }: { label: string; value?: string | null; strong?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontWeight: '900', color: colors.navyDark }]} selectable>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  overline: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.8 },
  muted: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { color: colors.textMuted, width: 120 },
  rowValue: { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  docImage: { width: '100%', borderRadius: radius.sm, backgroundColor: colors.bg },
  pdf: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  tile: { backgroundColor: colors.bg, borderRadius: radius.sm },
  mapsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.sm },
  mapsLinkText: { color: colors.navy, fontWeight: '800' },
  selfieNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 10, marginTop: spacing.sm },
  chip: { backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, color: colors.text },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
});
