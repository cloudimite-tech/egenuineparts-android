import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { API_BASE_URL, resolveImageUrl } from '../../api/config';
import { getAuthToken } from '../../api/authToken';
import { Category, Condition, Currency, Fitment, Product } from '../../types';
import { currencySymbol, formatPrice } from '../../utils/format';
import { toLkr, useConfigStore } from '../../store/configStore';
import { Header } from '../../components/Header';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { SheetModal } from '../../components/SheetModal';
import { CategoryIcon } from '../../components/CategoryIcon';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductForm'>;

const MAX_PHOTOS = 6;
const CONDITIONS: { key: Condition; label: string }[] = [
  { key: 'NEW', label: 'New' },
  { key: 'USED', label: 'Used' },
  { key: 'REFURBISHED', label: 'Refurbished' },
];

type Photo = { key: string; url?: string; localUri?: string; uploading?: boolean };

async function uploadImage(localUri: string): Promise<string> {
  const name = localUri.split('/').pop() || 'photo.jpg';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const form = new FormData();
  form.append('file', { uri: localUri, name, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
  // fetch (not axios) — React Native's fetch handles multipart uploads natively.
  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Upload failed.');
  return data.url as string;
}

export function ProductFormScreen({ route, navigation }: Props) {
  const productId = route.params?.productId;
  const editing = !!productId;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(editing);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [condition, setCondition] = useState<Condition>('NEW');
  const [currency, setCurrency] = useState<Currency>('LKR');
  const [price, setPrice] = useState('');
  const usdToLkr = useConfigStore((s) => s.usdToLkr);
  // Rupees are whole numbers; dollars allow cents (e.g. 23.50).
  const money = (v: string) => {
    if (currency === 'LKR') return v.replace(/\D/g, '');
    const [whole, ...rest] = v.replace(/[^0-9.]/g, '').split('.');
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
  };
  const fmt = (n: number) => (currency === 'USD' ? String(Number(n.toFixed(2))) : String(Math.round(n)));
  const [compareAt, setCompareAt] = useState('');
  const [stock, setStock] = useState('1');
  const [warranty, setWarranty] = useState('');
  const [description, setDescription] = useState('');
  const [fitments, setFitments] = useState<Fitment[]>([]);
  const [saleOn, setSaleOn] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [saleDays, setSaleDays] = useState<number | null>(3);
  const [existingSaleEnd, setExistingSaleEnd] = useState<string | null>(null);
  const [fitDraft, setFitDraft] = useState({ make: '', model: '', yearFrom: '', yearTo: '' });
  const [catOpen, setCatOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get<Category[]>('/categories').then((r) => setCategories(r.data)).catch(() => {});
    if (!productId) return;
    apiClient
      .get<Product>(`/products/${productId}`)
      .then(({ data: p }) => {
        setTitle(p.title);
        setBrand(p.brand);
        setPartNumber(p.partNumber ?? '');
        setCategoryId(p.categoryId ?? null);
        setCondition(p.condition);
        // Edit the raw prices, not the sale-adjusted display price.
        const regular = p.regularPrice ?? p.price;
        const regularCompare = p.regularCompareAtPrice !== undefined ? p.regularCompareAtPrice : p.compareAtPrice;
        const cur = (p.currency ?? 'LKR') as Currency;
        setCurrency(cur);
        const f = (n: number) => (cur === 'USD' ? String(Number(n.toFixed(2))) : String(Math.round(n)));
        setPrice(f(Number(regular)));
        setCompareAt(regularCompare ? f(Number(regularCompare)) : '');
        const saleLive = !!p.salePrice && !!p.rawSaleEndsAt && new Date(p.rawSaleEndsAt).getTime() > Date.now();
        setSaleOn(saleLive);
        if (saleLive) {
          setSalePrice(f(Number(p.salePrice)));
          setExistingSaleEnd(p.rawSaleEndsAt!);
          setSaleDays(null);
        }
        setStock(String(p.stock));
        setWarranty(p.warrantyMonths ? String(p.warrantyMonths) : '');
        setDescription(p.description ?? '');
        setFitments((p.fitments ?? []).map(({ make, model, yearFrom, yearTo }) => ({ make, model, yearFrom, yearTo })));
        setPhotos(p.images.map((img) => ({ key: img.id, url: img.url })));
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [productId]);

  const categoryName = useMemo(() => {
    for (const parent of categories) {
      if (parent.id === categoryId) return parent.name;
      const child = parent.children.find((c) => c.id === categoryId);
      if (child) return `${parent.name} › ${child.name}`;
    }
    return null;
  }, [categories, categoryId]);

  const addPhotos = async (source: 'library' | 'camera') => {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add photos.`);
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: room,
            quality: 0.7,
          });
    if (result.canceled) return;

    const picked = result.assets.slice(0, room).map((a, i) => ({ key: `local_${Date.now()}_${i}`, localUri: a.uri, uploading: true }));
    setPhotos((p) => [...p, ...picked]);
    for (const ph of picked) {
      try {
        const url = await uploadImage(ph.localUri!);
        setPhotos((list) => list.map((x) => (x.key === ph.key ? { ...x, url, uploading: false } : x)));
      } catch (e) {
        setPhotos((list) => list.filter((x) => x.key !== ph.key));
        toast.error(errorMessage(e, 'A photo failed to upload.'));
      }
    }
  };

  const choosePhotoSource = () =>
    Alert.alert('Add photos', undefined, [
      { text: 'Take photo', onPress: () => addPhotos('camera') },
      { text: 'Choose from library', onPress: () => addPhotos('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const makeCover = (key: string) =>
    setPhotos((list) => {
      const p = list.find((x) => x.key === key);
      return p ? [p, ...list.filter((x) => x.key !== key)] : list;
    });

  const addFitment = () => {
    const yf = Number(fitDraft.yearFrom);
    const yt = Number(fitDraft.yearTo || fitDraft.yearFrom);
    if (!fitDraft.make.trim() || !fitDraft.model.trim() || !yf) {
      toast.error('Enter make, model and year.');
      return;
    }
    if (yt < yf) {
      toast.error('"To" year must be after "from" year.');
      return;
    }
    setFitments((f) => [...f, { make: cap(fitDraft.make), model: cap(fitDraft.model), yearFrom: yf, yearTo: yt }]);
    setFitDraft({ make: '', model: '', yearFrom: '', yearTo: '' });
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = 'Add a clear title (e.g. "Front brake pads, ceramic").';
    if (!brand.trim()) e.brand = 'Enter the brand.';
    if (!(Number(price) > 0)) e.price = 'Enter a price.';
    if (compareAt && Number(compareAt) <= Number(price)) e.compareAt = 'Must be higher than the price to show a discount.';
    if (stock === '' || Number(stock) < 0 || !Number.isInteger(Number(stock))) e.stock = 'Enter how many you have.';
    if (!categoryId) e.category = 'Choose a category so buyers can find it.';
    if (saleOn) {
      if (!Number(salePrice)) e.salePrice = 'Enter the sale price.';
      else if (Number(salePrice) >= Number(price)) e.salePrice = 'Sale price must be lower than the price.';
      if (saleDays === null && !existingSaleEnd) e.salePrice = e.salePrice ?? 'Choose how long the sale runs.';
    }
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    if (photos.some((p) => p.uploading)) {
      toast.info('Wait for photos to finish uploading.');
      return;
    }
    setSaving(true);
    const body = {
      title: title.trim(),
      brand: brand.trim(),
      partNumber: partNumber.trim() || undefined,
      categoryId,
      condition,
      currency,
      price: Number(price),
      compareAtPrice: compareAt ? Number(compareAt) : null,
      stock: Number(stock),
      warrantyMonths: warranty ? Number(warranty) : null,
      salePrice: saleOn ? Number(salePrice) : null,
      saleEndsAt: saleOn
        ? saleDays !== null
          ? new Date(Date.now() + saleDays * 86400000).toISOString()
          : existingSaleEnd
        : null,
      description: description.trim() || undefined,
      images: photos.filter((p) => p.url).map((p) => p.url!),
      fitments,
    };
    try {
      if (editing) await apiClient.patch(`/products/${productId}`, body);
      else await apiClient.post('/products', body);
      toast.success(editing ? 'Listing updated' : 'Your part is live!');
      navigation.goBack();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Edit listing" back />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={editing ? 'Edit listing' : 'List a part'} back />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        {/* Photos */}
        <Card title="Photos" hint={`${photos.length}/${MAX_PHOTOS} · first photo is the cover`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {photos.map((p, i) => (
              <TouchableOpacity key={p.key} onPress={() => makeCover(p.key)} activeOpacity={0.9}>
                <Image source={{ uri: p.localUri ?? resolveImageUrl(p.url) ?? undefined }} style={styles.photo} />
                {p.uploading ? (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                ) : null}
                {i === 0 ? (
                  <View style={styles.coverTag}>
                    <Text style={styles.coverText}>Cover</Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos((list) => list.filter((x) => x.key !== p.key))} hitSlop={6}>
                  <Ionicons name="close" size={14} color={colors.white} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <TouchableOpacity style={styles.addPhoto} onPress={choosePhotoSource}>
                <Ionicons name="camera-outline" size={26} color={colors.accent} />
                <Text style={styles.addPhotoText}>Add photo</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
          {photos.length > 1 ? <Text style={styles.hintSmall}>Tap a photo to make it the cover.</Text> : null}
        </Card>

        {/* Basics */}
        <Card title="Details">
          <TextField label="Title" placeholder="Ceramic Front Brake Pads" value={title} onChangeText={setTitle} error={errors.title} maxLength={120} />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <TextField label="Brand" placeholder="Brembo" value={brand} onChangeText={setBrand} error={errors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Part number" optional placeholder="P 83 152" autoCapitalize="characters" value={partNumber} onChangeText={setPartNumber} />
            </View>
          </View>

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity style={[styles.select, !!errors.category && { borderColor: colors.accent }]} onPress={() => setCatOpen(true)}>
            <Text style={[styles.selectText, !categoryName && { color: colors.textFaint }]} numberOfLines={1}>
              {categoryName ?? 'Choose a category'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {errors.category ? <Text style={styles.err}>{errors.category}</Text> : <View style={{ height: spacing.md }} />}

          <Text style={styles.label}>Condition</Text>
          <View style={styles.segment}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity key={c.key} style={[styles.segBtn, condition === c.key && styles.segBtnOn]} onPress={() => setCondition(c.key)}>
                <Text style={[styles.segText, condition === c.key && styles.segTextOn]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextField
            label="Description"
            optional
            multiline
            placeholder="Material, what's in the box, anything a buyer should know."
            value={description}
            onChangeText={setDescription}
            maxLength={2000}
            hint="Don't include phone numbers or links — buyers can chat with you in the app."
          />
        </Card>

        {/* Price & stock */}
        <Card title="Price & stock">
          <Text style={styles.label}>Currency</Text>
          <View style={styles.segment}>
            {(['LKR', 'USD'] as Currency[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.segBtn, currency === c && styles.segBtnOn]}
                onPress={() => {
                  if (c === currency) return;
                  setCurrency(c);
                  // Different units — clear amounts rather than silently mis-pricing.
                  setPrice('');
                  setCompareAt('');
                  setSalePrice('');
                }}
              >
                <Text style={[styles.segText, currency === c && styles.segTextOn]}>
                  {c === 'LKR' ? 'LKR · Rs.' : 'USD · $'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <TextField label="Price" prefix={currencySymbol(currency)} keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'} placeholder={currency === 'USD' ? '45.00' : '14500'} value={price} onChangeText={(v) => setPrice(money(v))} error={errors.price} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Was price" optional prefix={currencySymbol(currency)} keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'} placeholder={currency === 'USD' ? '52.00' : '16900'} value={compareAt} onChangeText={(v) => setCompareAt(money(v))} error={errors.compareAt} />
            </View>
          </View>
          {currency === 'USD' && Number(price) > 0 ? (
            <Text style={styles.usdNote}>
              Buyers see ${Number(price).toFixed(2)} ≈ {formatPrice(toLkr(price, 'USD', usdToLkr))} and pay in rupees on delivery (1 USD = Rs. {usdToLkr}).
            </Text>
          ) : null}
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <TextField label="Stock" keyboardType="number-pad" value={stock} onChangeText={(v) => setStock(v.replace(/\D/g, ''))} error={errors.stock} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Warranty (months)" optional keyboardType="number-pad" placeholder="6" value={warranty} onChangeText={(v) => setWarranty(v.replace(/\D/g, ''))} />
            </View>
          </View>
        </Card>

        {/* Flash sale */}
        <Card title="Flash sale" hint="Run a limited-time price. It appears in the Flash Sale on the home screen with a countdown, and switches back to your normal price automatically.">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Put this part on sale</Text>
            <Switch
              value={saleOn}
              onValueChange={setSaleOn}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
          {saleOn ? (
            <>
              <TextField
                label="Sale price"
                prefix={currencySymbol(currency)}
                keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'}
                placeholder={price ? fmt(Number(price) * 0.85) : currency === 'USD' ? '39.00' : '12000'}
                value={salePrice}
                onChangeText={(v) => setSalePrice(money(v))}
                error={errors.salePrice}
              />
              <Text style={styles.label}>Sale runs for</Text>
              <View style={styles.durationRow}>
                {existingSaleEnd ? (
                  <TouchableOpacity style={[styles.duration, saleDays === null && styles.durationOn]} onPress={() => setSaleDays(null)}>
                    <Text style={[styles.durationText, saleDays === null && styles.durationTextOn]}>
                      Until {new Date(existingSaleEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {[
                  { d: 1, l: '24 hours' },
                  { d: 3, l: '3 days' },
                  { d: 7, l: '7 days' },
                  { d: 14, l: '14 days' },
                ].map((o) => (
                  <TouchableOpacity key={o.d} style={[styles.duration, saleDays === o.d && styles.durationOn]} onPress={() => setSaleDays(o.d)}>
                    <Text style={[styles.durationText, saleDays === o.d && styles.durationTextOn]}>{o.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {Number(salePrice) > 0 && Number(salePrice) < Number(price) ? (
                <View style={styles.salePreview}>
                  <Ionicons name="flash" size={16} color="#FF5A1F" />
                  <Text style={styles.salePreviewText}>
                    Buyers pay {formatPrice(salePrice, currency)} ({Math.round((1 - Number(salePrice) / Number(price)) * 100)}% off) instead of{' '}
                    {formatPrice(price, currency)}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </Card>

        {/* Fitment */}
        <Card title="Fits these vehicles" hint="Buyers who pick one of these see a green “Fits” badge. Leave empty for universal parts.">
          {fitments.map((f, i) => (
            <View key={`${f.make}${f.model}${i}`} style={styles.fitRow}>
              <Ionicons name="car-sport-outline" size={18} color={colors.textMuted} />
              <Text style={styles.fitText}>
                {f.make} {f.model}
              </Text>
              <Text style={styles.fitYears}>
                {f.yearFrom}
                {f.yearTo !== f.yearFrom ? `–${f.yearTo}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setFitments((list) => list.filter((_, j) => j !== i))} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textFaint} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={[styles.row2, { marginTop: fitments.length ? spacing.sm : 0 }]}>
            <View style={{ flex: 1 }}>
              <TextField placeholder="Make" value={fitDraft.make} onChangeText={(v) => setFitDraft((d) => ({ ...d, make: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField placeholder="Model" value={fitDraft.model} onChangeText={(v) => setFitDraft((d) => ({ ...d, model: v }))} />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <TextField placeholder="Year from" keyboardType="number-pad" maxLength={4} value={fitDraft.yearFrom} onChangeText={(v) => setFitDraft((d) => ({ ...d, yearFrom: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField placeholder="Year to" keyboardType="number-pad" maxLength={4} value={fitDraft.yearTo} onChangeText={(v) => setFitDraft((d) => ({ ...d, yearTo: v }))} />
            </View>
          </View>
          <Button title="Add vehicle" variant="outline" size="sm" icon="add" onPress={addFitment} />
        </Card>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <Button title={editing ? 'Save changes' : 'Publish listing'} onPress={save} loading={saving} />
      </View>

      <SheetModal visible={catOpen} onClose={() => setCatOpen(false)} title="Category">
        {categories.map((parent) => (
          <View key={parent.id} style={{ marginBottom: spacing.md }}>
            <View style={styles.catHead}>
              <CategoryIcon icon={parent.icon} size={20} color={colors.accent} />
              <Text style={styles.catHeadText}>{parent.name}</Text>
            </View>
            <View style={styles.catChips}>
              {parent.children.map((c) => {
                const on = c.id === categoryId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, on && styles.catChipOn]}
                    onPress={() => {
                      setCategoryId(c.id);
                      setCatOpen(false);
                    }}
                  >
                    <Text style={[styles.catChipText, on && { color: colors.white }]}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </SheetModal>
    </KeyboardAvoidingView>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
      <View style={{ marginTop: spacing.md }}>{children}</View>
    </View>
  );
}

const cap = (s: string) => s.trim().replace(/\b\w/g, (c) => c.toUpperCase());

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm + 4 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardHint: { color: colors.textMuted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  photo: { width: 96, height: 96, borderRadius: radius.sm, backgroundColor: colors.bg },
  photoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  coverTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: colors.navy, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  coverText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  photoRemove: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  hintSmall: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  row2: { flexDirection: 'row', gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  select: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectText: { fontSize: 15, color: colors.text, flex: 1 },
  err: { color: colors.accent, fontSize: 12, marginTop: 6, marginBottom: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.sm, padding: 3, marginBottom: spacing.md },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  segBtnOn: { backgroundColor: colors.navy },
  segText: { fontWeight: '700', color: colors.textMuted },
  segTextOn: { color: colors.white },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  fitText: { flex: 1, fontWeight: '700' },
  fitYears: { color: colors.textMuted, fontWeight: '700' },
  usdNote: { color: colors.textMuted, fontSize: 12, marginTop: -6, marginBottom: spacing.md, lineHeight: 17 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  switchLabel: { fontSize: 15, fontWeight: '700' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  duration: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  durationOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  durationText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  durationTextOn: { color: colors.white },
  salePreview: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFF1EA', borderRadius: radius.sm, padding: 12 },
  salePreviewText: { flex: 1, color: '#9A3412', fontWeight: '700', fontSize: 13 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2, borderTopWidth: 1, borderTopColor: colors.border },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  catHeadText: { fontWeight: '800', fontSize: 15 },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  catChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  catChipText: { fontWeight: '600', color: colors.text },
});
