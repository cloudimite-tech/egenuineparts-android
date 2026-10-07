import { useNoScreenshots } from '../../utils/useNoScreenshots';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { Header } from '../../components/Header';
import { TextField } from '../../components/TextField';
import { DistrictSelect } from '../../components/DistrictSelect';
import { Button } from '../../components/Button';
import { DocUploader, UploadedDoc } from '../../components/DocUploader';
import { LatLng, LocationMap } from '../../components/LocationMap';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { isValidSlPhone, localPart, normalizePhone } from '../../utils/phone';
import { SRI_LANKA_DISTRICTS } from '../../utils/format';
import { MyApplication } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerApplication'>;
type Place = { label: string; lat: number; lng: number };

const NIC_RE = /^(\d{9}[VvXx]|\d{12})$/;
const inSriLanka = (p: LatLng) => p.lat >= 5.7 && p.lat <= 10.1 && p.lng >= 79.4 && p.lng <= 82.1;

// Current position, or null if permission is refused / it takes too long.
async function currentPosition(): Promise<LatLng | null> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return null;
  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 10000)),
    ]);
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}

export function SellerApplicationScreen({ navigation }: Props) {
  useNoScreenshots('seller-application');
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // store
  const [storeName, setStoreName] = useState('');
  const [bio, setBio] = useState('');
  // identity
  const [nicNumber, setNicNumber] = useState('');
  const [nicFront, setNicFront] = useState<UploadedDoc | null>(null);
  const [nicBack, setNicBack] = useState<UploadedDoc | null>(null);
  // business registration
  const [businessName, setBusinessName] = useState('');
  const [brNumber, setBrNumber] = useState('');
  const [brDoc, setBrDoc] = useState<UploadedDoc | null>(null);
  // address + map
  const [sameAddress, setSameAddress] = useState(false);
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(localPart(profile?.phone));
  const [pin, setPin] = useState<LatLng | null>(null);
  const [pinTouched, setPinTouched] = useState(false); // user placed it by hand → stop auto-moving it
  const [mapNote, setMapNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // selfie
  const [selfie, setSelfie] = useState<UploadedDoc | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get<MyApplication>('/seller-application')
      .then(({ data }) => {
        const a = data.application;
        if (!a) return;
        setStoreName(a.storeName ?? '');
        setBio(a.bio ?? '');
        setNicNumber(a.nicNumber ?? '');
        setNicFront(a.nicFront ?? null);
        setNicBack(a.nicBack ?? null);
        setBusinessName(a.businessName ?? '');
        setBrNumber(a.brNumber ?? '');
        setBrDoc(a.document ?? null);
        setAddressLine1(a.addressLine1 ?? '');
        setAddressLine2(a.addressLine2 ?? '');
        setCity(a.city ?? '');
        setDistrict(a.district ?? '');
        if (a.contactPhone) setPhone(localPart(a.contactPhone));
        if (a.latitude != null && a.longitude != null) {
          setPin({ lat: a.latitude, lng: a.longitude });
          setPinTouched(true);
        }
        setSelfie(a.selfie ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // As the address is typed, find it on the map (until the user moves the pin themselves).
  const geocodeSeq = useRef(0);
  const findOnMap = async (force = false) => {
    if (pinTouched && !force) return;
    const queries = [
      [addressLine1, addressLine2, city, district && `${district} District`].filter(Boolean).join(', '),
      [city, district].filter(Boolean).join(', '),
    ].filter((q) => q.trim().length >= 3);
    if (!queries.length) return;
    const seq = ++geocodeSeq.current;
    for (const [i, q] of queries.entries()) {
      const { data } = await apiClient.get<Place[]>('/geo/search', { params: { q } }).catch(() => ({ data: [] as Place[] }));
      if (seq !== geocodeSeq.current) return; // a newer search started
      if (data.length) {
        setPin({ lat: data[0].lat, lng: data[0].lng });
        setMapNote(i === 0 ? 'Found your address — drag the pin to the exact shop entrance if needed.' : 'Showing your town — drag the pin to your exact shop location.');
        setErrors((e) => ({ ...e, pin: '' }));
        return;
      }
    }
    setMapNote('Couldn’t find that address on the map — tap the map or drag the pin to your shop.');
  };

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => findOnMap(false), 1200);
    return () => clearTimeout(t);
  }, [addressLine1, city, district, loading]);

  const useMyLocation = async () => {
    setLocating(true);
    const pos = await currentPosition();
    setLocating(false);
    if (!pos) {
      toast.error('Couldn’t get your location. Turn on location, or drag the pin instead.');
      return;
    }
    setPin(pos);
    setPinTouched(true);
    setMapNote('Pinned to where you are now. Make sure you’re at the shop.');
    setErrors((e) => ({ ...e, pin: '' }));
    // Fill in the town / district if they're still empty.
    const { data } = await apiClient.get('/geo/reverse', { params: pos }).catch(() => ({ data: null as any }));
    if (data) {
      if (!city && data.city) setCity(data.city);
      if (!district && data.district && SRI_LANKA_DISTRICTS.includes(data.district)) setDistrict(data.district);
    }
  };

  const toggleSame = (v: boolean) => {
    setSameAddress(v);
    if (v && profile) {
      setAddressLine1(profile.addressLine1 ?? '');
      setAddressLine2(profile.addressLine2 ?? '');
      setCity(profile.city ?? '');
      setDistrict(profile.district ?? '');
    }
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (storeName.trim().length < 2) e.storeName = 'Enter your store name.';
    if (!NIC_RE.test(nicNumber.trim())) e.nicNumber = 'Enter a valid NIC number (e.g. 912345678V or 199112345678).';
    if (!nicFront) e.nicFront = 'Add a photo of the front of your NIC.';
    if (!nicBack) e.nicBack = 'Add a photo of the back of your NIC.';
    if (businessName.trim().length < 2) e.businessName = 'Enter the registered business name.';
    if (brNumber.trim().length < 3) e.brNumber = 'Enter the BR / registration number.';
    if (!brDoc) e.brDoc = 'Upload your BR certificate.';
    if (addressLine1.trim().length < 3) e.addressLine1 = 'Enter the shop address.';
    if (city.trim().length < 2) e.city = 'Enter the city.';
    if (!district) e.district = 'Choose the district.';
    if (!isValidSlPhone(phone)) e.phone = 'Enter a valid phone number.';
    if (!pin || !inSriLanka(pin)) e.pin = 'Pin your shop’s location on the map.';
    if (!selfie) e.selfie = 'Take a selfie at your shop.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast.error('Please complete the highlighted fields');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.put('/seller-application', {
        storeName: storeName.trim(),
        bio: bio.trim() || undefined,
        nicNumber: nicNumber.trim().toUpperCase(),
        nicFrontDocumentId: nicFront!.id,
        nicBackDocumentId: nicBack!.id,
        businessName: businessName.trim(),
        brNumber: brNumber.trim(),
        documentId: brDoc!.id,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        district,
        contactPhone: normalizePhone(phone),
        latitude: pin!.lat,
        longitude: pin!.lng,
        selfieDocumentId: selfie!.id,
      });
      await refreshProfile();
      toast.success('Application submitted');
      navigation.canGoBack() ? navigation.goBack() : navigation.replace('SellerGate');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Seller application" back />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Seller application" subtitle="Reviewed by our team, usually within 1–2 working days." back />
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.navy} />
          <Text style={styles.privacyText}>Your NIC, certificate and selfie are only seen by our verification team — never by buyers.</Text>
        </View>

        <Card step={1} title="Your store" icon="storefront-outline">
          <TextField label="Store name" placeholder="Matara Motor Mart" value={storeName} onChangeText={setStoreName} error={errors.storeName} hint="Shown to buyers." />
          <TextField label="About your store" optional placeholder="What you sell, brands, experience…" value={bio} onChangeText={setBio} multiline />
        </Card>

        <Card step={2} title="Your identity" icon="id-card-outline">
          <TextField
            label="NIC number"
            placeholder="912345678V or 199112345678"
            autoCapitalize="characters"
            maxLength={12}
            value={nicNumber}
            onChangeText={(t) => setNicNumber(t.replace(/[^0-9vVxX]/g, ''))}
            error={errors.nicNumber}
          />
          <DocUploader kind="NIC_FRONT" title="NIC — front" hint="A clear photo, all four corners visible" value={nicFront} onChange={setNicFront} error={errors.nicFront} />
          <DocUploader kind="NIC_BACK" title="NIC — back" hint="A clear photo, all four corners visible" value={nicBack} onChange={setNicBack} error={errors.nicBack} />
        </Card>

        <Card step={3} title="Business registration" icon="document-text-outline">
          <TextField label="Registered business name" placeholder="As on the BR certificate" value={businessName} onChangeText={setBusinessName} error={errors.businessName} />
          <TextField label="BR / registration number" placeholder="e.g. PV 00123456" autoCapitalize="characters" value={brNumber} onChangeText={setBrNumber} error={errors.brNumber} />
          <DocUploader kind="BR" title="BR certificate" hint="Photo or PDF · max 4 MB" value={brDoc} onChange={setBrDoc} error={errors.brDoc} />
        </Card>

        <Card step={4} title="Shop address & location" icon="location-outline">
          <View style={styles.sameRow}>
            <Text style={styles.sameText}>Same as my personal address</Text>
            <Switch value={sameAddress} onValueChange={toggleSame} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={colors.white} />
          </View>
          <TextField label="Address" placeholder="Shop no. and street" value={addressLine1} onChangeText={setAddressLine1} error={errors.addressLine1} />
          <TextField label="Apartment, lane or landmark" optional value={addressLine2} onChangeText={setAddressLine2} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="City" placeholder="Matara" value={city} onChangeText={setCity} error={errors.city} />
            </View>
            <View style={{ flex: 1 }}>
              <DistrictSelect value={district} onChange={setDistrict} error={errors.district} />
            </View>
          </View>
          <TextField label="Business phone" prefix="+94" keyboardType="phone-pad" placeholder="41 222 3344" value={phone} onChangeText={setPhone} error={errors.phone} hint="For our verification team only — not shown to buyers." />

          <Text style={styles.label}>Pin your shop on the map</Text>
          <LocationMap
            value={pin}
            onChange={(p) => {
              setPin(p);
              setPinTouched(true);
              setMapNote('Pin placed. You can drag it to fine-tune.');
              setErrors((e) => ({ ...e, pin: '' }));
            }}
            height={240}
            style={errors.pin ? { borderColor: colors.accent } : undefined}
            onTouchStart={() => setScrollEnabled(false)}
            onTouchEnd={() => setScrollEnabled(true)}
          />
          <Text style={[styles.mapNote, !!errors.pin && { color: colors.accent }]}>
            {errors.pin || mapNote || 'Type your address above and we’ll find it — or tap the map to drop the pin.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity style={styles.mapBtn} onPress={useMyLocation} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color={colors.navy} /> : <Ionicons name="locate-outline" size={16} color={colors.navy} />}
              <Text style={styles.mapBtnText}>Use my current location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapBtn} onPress={() => findOnMap(true)}>
              <Ionicons name="search-outline" size={16} color={colors.navy} />
              <Text style={styles.mapBtnText}>Find address</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card step={5} title="Selfie at your shop" icon="camera-outline">
          <Text style={styles.help}>
            Stand inside your shop or warehouse so your face and the shop are both visible. We record where the photo was taken to confirm your shop is real.
          </Text>
          <DocUploader
            kind="SELFIE"
            title="Shop selfie"
            hint="Opens the front camera"
            selfie
            value={selfie}
            onChange={setSelfie}
            error={errors.selfie}
            getExtra={async () => {
              const pos = await currentPosition();
              return pos ? { lat: pos.lat, lng: pos.lng } : undefined;
            }}
          />
        </Card>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <Button title="Submit for review" icon="send-outline" onPress={submit} loading={submitting} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Card({ step, title, icon, children }: { step: number; title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.step}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Ionicons name={icon} size={20} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  privacy: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.navySoft, borderRadius: radius.sm, padding: 12, marginBottom: spacing.md },
  privacyText: { flex: 1, color: colors.navyDark, fontSize: 12, lineHeight: 17 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  step: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  sameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sameText: { fontWeight: '600', color: colors.text },
  mapNote: { color: colors.textMuted, fontSize: 12, marginTop: 6, marginBottom: spacing.sm, lineHeight: 17 },
  mapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.navy, borderRadius: radius.sm, paddingVertical: 10 },
  mapBtnText: { color: colors.navy, fontWeight: '700', fontSize: 12 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
});
