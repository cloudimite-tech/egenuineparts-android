import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { ProductImage } from '../components/ProductImage';
import { SheetModal } from '../components/SheetModal';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { toLkr, useConfigStore } from '../store/configStore';
import { UsdHint } from '../components/PriceTag';
import { Order } from '../types';
import { errorMessage } from '../utils/useRequireAccount';
import { formatPrice, SRI_LANKA_DISTRICTS } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const ADDRESS_KEY = 'redline_last_address';
const DELIVERY_FEE = 450;

export function CheckoutScreen({ route, navigation }: Props) {
  const cartItemIds = route.params?.cartItemIds;
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { cart, refresh } = useCartStore();
  const usdToLkr = useConfigStore((s) => s.usdToLkr);

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [districtOpen, setDistrictOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ADDRESS_KEY)
      .then((raw) => {
        if (!raw) return;
        const a = JSON.parse(raw);
        setAddressLine1(a.addressLine1 ?? '');
        setAddressLine2(a.addressLine2 ?? '');
        setCity(a.city ?? '');
        setDistrict(a.district ?? '');
        if (a.contactPhone) setPhone(a.contactPhone);
      })
      .catch(() => {});
  }, []);

  // "Buy now" checks out only the chosen line(s); otherwise the whole cart.
  const items = useMemo(
    () => (cart?.items ?? []).filter((i) => !cartItemIds || cartItemIds.includes(i.id)),
    [cart, cartItemIds],
  );
  const sellers = new Set(items.map((i) => i.product.storeId)).size;
  // Totals are settled in rupees; USD lines use the server's rate.
  const subtotal = items.reduce((s, i) => s + (i.product.priceLkr ?? toLkr(i.product.price, i.product.currency)) * i.quantity, 0);
  const hasUsd = items.some((i) => i.product.currency === 'USD');
  const delivery = sellers * DELIVERY_FEE;
  const total = subtotal + delivery;

  const validate = () => {
    const e: Record<string, string> = {};
    if (addressLine1.trim().length < 3) e.addressLine1 = 'Enter your house number and street.';
    if (city.trim().length < 2) e.city = 'Enter your city.';
    if (!district) e.district = 'Choose your district.';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) e.phone = 'Enter a mobile number the courier can call.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    setServerError(null);
    if (!validate()) return;
    setPlacing(true);
    const address = {
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
      district,
      contactPhone: normalizePhone(phone),
    };
    try {
      const { data } = await apiClient.post<Order>('/orders/checkout', {
        ...address,
        paymentMethod: 'COD',
        cartItemIds,
      });
      AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(address)).catch(() => {});
      refresh().catch(() => {});
      useAuthStore.getState().refreshProfile().catch(() => {});
      navigation.reset({
        index: 1,
        routes: [{ name: 'Main', params: { screen: 'Home' } }, { name: 'OrderSuccess', params: { orderId: data.id } }],
      });
    } catch (e) {
      setServerError(errorMessage(e));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Checkout" back />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Card title="Delivery address" icon="location-outline">
          <TextField label="Address" placeholder="House no. and street" value={addressLine1} onChangeText={setAddressLine1} error={errors.addressLine1} />
          <TextField label="Apartment, lane or landmark" optional placeholder="Near the temple, 2nd lane…" value={addressLine2} onChangeText={setAddressLine2} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="City" placeholder="Nugegoda" value={city} onChangeText={setCity} error={errors.city} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>District</Text>
              <TouchableOpacity style={[styles.select, !!errors.district && { borderColor: colors.accent }]} onPress={() => setDistrictOpen(true)}>
                <Text style={[styles.selectText, !district && { color: colors.textFaint }]}>{district || 'Select'}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {errors.district ? <Text style={styles.err}>{errors.district}</Text> : null}
            </View>
          </View>
          <TextField
            label="Mobile number for delivery"
            prefix="+94"
            placeholder="77 123 4567"
            keyboardType="phone-pad"
            value={phone.replace(/^\+94\s?/, '')}
            onChangeText={(v) => setPhone(v)}
            error={errors.phone}
            hint="Only shared with the seller for this delivery — never shown in chat."
          />
        </Card>

        <Card title="Payment" icon="wallet-outline">
          <View style={[styles.payOption, styles.payOptionActive]}>
            <Ionicons name="cash-outline" size={22} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>Cash on delivery</Text>
              <Text style={styles.paySub}>Pay the courier when your parts arrive</Text>
            </View>
            <Ionicons name="radio-button-on" size={22} color={colors.accent} />
          </View>
          <View style={[styles.payOption, { opacity: 0.5 }]}>
            <Ionicons name="card-outline" size={22} color={colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>Card / online payment</Text>
              <Text style={styles.paySub}>Coming soon</Text>
            </View>
          </View>
        </Card>

        <Card title={`Order summary · ${items.length} item${items.length === 1 ? '' : 's'}`} icon="receipt-outline">
          {items.map((i) => (
            <View key={i.id} style={styles.line}>
              <ProductImage url={i.product.images?.[0]?.url} style={{ width: 52, height: 52 }} iconSize={22} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lineTitle} numberOfLines={1}>
                  {i.product.title}
                </Text>
                <Text style={styles.lineSub}>
                  {i.product.store?.name} · Qty {i.quantity}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.linePrice}>{formatPrice(Number(i.product.price) * i.quantity, i.product.currency)}</Text>
                <UsdHint amount={Number(i.product.price) * i.quantity} currency={i.product.currency} />
              </View>
            </View>
          ))}
          <View style={styles.totals}>
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label={`Delivery (${sellers} seller${sellers === 1 ? '' : 's'})`} value={formatPrice(delivery)} />
            <Row label="Total to pay on delivery" value={formatPrice(total)} strong />
            {hasUsd ? (
              <Text style={styles.rateNote}>Includes USD-priced parts at 1 USD = Rs. {usdToLkr}. You pay in rupees.</Text>
            ) : null}
          </View>
        </Card>

        {serverError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <Button title={`Place order · ${formatPrice(total)}`} onPress={placeOrder} loading={placing} disabled={items.length === 0} />
      </View>

      <SheetModal visible={districtOpen} onClose={() => setDistrictOpen(false)} title="District">
        {SRI_LANKA_DISTRICTS.map((d) => (
          <TouchableOpacity
            key={d}
            style={styles.districtRow}
            onPress={() => {
              setDistrict(d);
              setDistrictOpen(false);
            }}
          >
            <Text style={[styles.districtText, d === district && { color: colors.accent, fontWeight: '800' }]}>{d}</Text>
            {d === district ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
          </TouchableOpacity>
        ))}
      </SheetModal>
    </KeyboardAvoidingView>
  );
}

// Store numbers as +94XXXXXXXXX whether typed as 077…, 77… or +94 77…
function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('94')) return `+${d}`;
  if (d.startsWith('0')) return `+94${d.slice(1)}`;
  return `+94${d}`;
}

function Card({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={20} color={colors.text} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={[{ color: colors.textMuted }, strong && styles.strong]}>{label}</Text>
      <Text style={[{ fontWeight: '600' }, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  select: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { fontSize: 15, color: colors.text },
  err: { color: colors.accent, fontSize: 12, marginTop: 6 },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.sm,
  },
  payOptionActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  payTitle: { fontWeight: '800', fontSize: 15 },
  paySub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  lineTitle: { fontWeight: '600', fontSize: 14 },
  lineSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  linePrice: { fontWeight: '800' },
  totals: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: spacing.sm, paddingTop: spacing.sm },
  strong: { fontWeight: '900', color: colors.text, fontSize: 16 },
  rateNote: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  errorBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  errorText: { color: colors.accentDark, flex: 1, fontWeight: '600' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  districtRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  districtText: { fontSize: 16 },
});
