import React, { useCallback, useEffect, useState } from 'react';
import { goBackOr } from '../../navigation/goBackOr';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Text } from '../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, HEADER_TOP, radius, shadow, spacing, themed } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { ServiceListing } from '../../types';
import { ProductImage } from '../../components/ProductImage';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { LocationMap } from '../../components/LocationMap';
import { ReportSheet, ReportTarget, reportStyles } from '../../components/ReportSheet';
import { useAuthStore } from '../../store/authStore';
import { errorMessage, useRequireAccount } from '../../utils/useRequireAccount';
import { toast } from '../../store/toastStore';
import { durationLabel, priceRange, serviceIcon } from '../../utils/services';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceDetail'>;

export function ServiceDetailScreen({ route, navigation }: Props) {
  const { serviceId } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const requireAccount = useRequireAccount();
  const profile = useAuthStore((s) => s.profile);
  const [service, setService] = useState<ServiceListing | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    apiClient
      .get<ServiceListing>(`/services/${serviceId}`)
      .then(({ data }) => setService(data))
      .catch(() => setFailed(true));
  }, [serviceId]);
  useEffect(load, [load]);

  if (!service) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Service" back />
        {failed ? (
          <EmptyState icon="construct-outline" title="Service not available" message="It may have been removed by the provider." actionLabel="Try again" onAction={load} />
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
        )}
      </View>
    );
  }

  const isOwn = !!profile?.store && profile.store.id === service.store.id;
  const place = [service.store.city, service.store.district].filter(Boolean).join(', ');
  const dur = durationLabel(service.durationMinutes);
  const images = service.images.length ? service.images : [null];

  const openChat = () =>
    requireAccount(async () => {
      setBusy(true);
      try {
        const { data } = await apiClient.post('/chat/conversations', { serviceId: service.id });
        navigation.navigate('ChatConversation', { conversationId: data.id });
      } catch (e) {
        toast.error(errorMessage(e, 'Couldn’t open the chat.'));
      } finally {
        setBusy(false);
      }
    }, 'Sign in to chat with the provider.');
  const book = () => requireAccount(() => navigation.navigate('BookAppointment', { serviceId: service.id }), 'Sign in to book an appointment.');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View>
          {service.images.length ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => <ProductImage url={item} style={{ width, height: width * 0.72 }} rounded={0} iconSize={80} />}
            />
          ) : (
            <View style={[styles.noImage, { width, height: width * 0.56 }]}>
              <View style={styles.noImageIcon}>
                <Ionicons name={serviceIcon(service.type.icon)} size={46} color={colors.accent} />
              </View>
            </View>
          )}
          <TouchableOpacity style={[styles.fab, { left: spacing.md }]} onPress={() => goBackOr(navigation)} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          {service.images.length > 1 ? (
            <View style={styles.dots}>
              {service.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.block}>
          <View style={styles.typePill}>
            <Ionicons name={serviceIcon(service.type.icon)} size={13} color={colors.accent} />
            <Text style={styles.typeText}>{service.type.name}</Text>
          </View>
          <Text style={styles.title}>{service.title}</Text>
          <Text style={styles.price}>{priceRange(service.priceFrom, service.priceTo)}</Text>
          <View style={styles.facts}>
            {dur ? <Fact icon="time-outline" text={dur} /> : null}
            {place ? <Fact icon="location-outline" text={place} /> : null}
            <Fact icon="calendar-outline" text="Book in the app" />
          </View>
        </View>

        <TouchableOpacity style={styles.storeCard} onPress={() => navigation.navigate('StoreProfile', { storeIdOrSlug: service.store.slug })} activeOpacity={0.85}>
          <View style={styles.storeIcon}>
            <Ionicons name="storefront" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={styles.storeName} numberOfLines={1}>{service.store.name}</Text>
              {service.store.verified ? <Ionicons name="checkmark-circle" size={16} color={colors.success} /> : null}
            </View>
            <Text style={styles.storeSub}>{service.store.verified ? 'Verified by AutoGuide' : 'Provider'}{place ? ` · ${place}` : ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
        </TouchableOpacity>

        {service.description ? (
          <View style={styles.block}>
            <Text style={styles.h}>About this service</Text>
            <Text style={styles.body}>{service.description}</Text>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.h}>How booking works</Text>
          <Step n={1} text="Ask any questions in the chat first - it stays private inside AutoGuide." />
          <Step n={2} text="Pick a day and time that suits you and send an appointment request." />
          <Step n={3} text="The provider accepts or suggests another time. You’ll see the shop address once it’s confirmed." />
        </View>

        {service.store.latitude != null && service.store.longitude != null ? (
          <View style={styles.block}>
            <Text style={styles.h}>Area</Text>
            <LocationMap value={{ lat: service.store.latitude, lng: service.store.longitude }} height={180} />
            <Text style={styles.muted}>The exact address is shared when your appointment is accepted.</Text>
          </View>
        ) : null}

        {!isOwn ? (
          <TouchableOpacity
            style={[reportStyles.link, { alignSelf: 'center', marginVertical: spacing.md }]}
            onPress={() => requireAccount(() => setReport({ type: 'SERVICE', id: service.id, label: 'service' }), 'Sign in to report this.')}
          >
            <Ionicons name="flag-outline" size={15} color={colors.textMuted} />
            <Text style={reportStyles.linkText}>Report this service</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <ReportSheet target={report} onClose={() => setReport(null)} />

      <View style={[styles.actionBar, { paddingBottom: spacing.sm + insets.bottom }]}>
        {isOwn ? (
          <TouchableOpacity style={[styles.primary, { backgroundColor: colors.navy }]} onPress={() => navigation.navigate('ServiceForm', { serviceId: service.id })}>
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.primaryText}>Edit your service</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.secondary} onPress={openChat} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.text} /> : (
                <>
                  <Ionicons name="chatbubbles-outline" size={19} color={colors.text} />
                  <Text style={styles.secondaryText}>Ask a question</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.primary} onPress={book}>
              <Ionicons name="calendar" size={18} color={colors.white} />
              <Text style={styles.primaryText}>Book appointment</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepN}>
        <Text style={styles.stepNText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  noImage: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  noImageIcon: { width: 96, height: 96, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  fab: { position: 'absolute', top: HEADER_TOP - 4, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...shadow },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  dotActive: { backgroundColor: colors.accent, width: 18 },
  block: { backgroundColor: colors.surface, padding: spacing.md, marginTop: spacing.sm },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 10, letterSpacing: -0.2 },
  price: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  factText: { fontSize: 12.5, color: colors.text, fontWeight: '600' },
  storeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: spacing.md, marginTop: spacing.sm },
  storeIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1 },
  storeSub: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  h: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: 14.5, color: colors.text, lineHeight: 21 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  stepN: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  stepNText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  stepText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  secondary: { flex: 1, height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.link, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '800', fontSize: 14.5, color: colors.text },
  primary: { flex: 1.25, height: 50, borderRadius: radius.md, backgroundColor: colors.accent, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 15 },
}));
