import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../../components/Themed';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing, themed } from '../../theme/theme';
import { apiClient } from '../../api/client';
import { resolveImageUrl } from '../../api/config';
import { ServiceListing, ServiceType } from '../../types';
import { Header } from '../../components/Header';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { SheetModal } from '../../components/SheetModal';
import { toast } from '../../store/toastStore';
import { errorMessage } from '../../utils/useRequireAccount';
import { serviceIcon, uploadImage } from '../../utils/services';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceForm'>;
type Photo = { key: string; url?: string; localUri?: string; uploading?: boolean };

const MAX_PHOTOS = 6;
const DURATIONS: [number | null, string][] = [[null, 'Not sure'], [30, '30 min'], [60, '1 hour'], [120, '2 hours'], [240, 'Half day'], [480, 'Full day'], [1440, '1 day+']];

export function ServiceFormScreen({ route, navigation }: Props) {
  const serviceId = route.params?.serviceId;
  const editing = !!serviceId;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // "My service isn't listed"
  const [reqOpen, setReqOpen] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [reqSaving, setReqSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: t }, mine] = await Promise.all([
          apiClient.get<ServiceType[]>('/service-types'),
          editing ? apiClient.get<ServiceListing[]>('/services/mine') : Promise.resolve(null),
        ]);
        setTypes(t);
        const s = mine?.data.find((x) => x.id === serviceId);
        if (s) {
          setTypeId(s.typeId);
          setTitle(s.title);
          setDescription(s.description ?? '');
          setPriceFrom(s.priceFrom != null ? String(Math.round(s.priceFrom)) : '');
          setPriceTo(s.priceTo != null ? String(Math.round(s.priceTo)) : '');
          setDuration(s.durationMinutes);
          setPhotos(s.images.map((url, i) => ({ key: `img_${i}`, url })));
        }
      } catch (e) {
        toast.error(errorMessage(e, 'Couldn’t load the form.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId]);

  const addPhotos = async (source: 'library' | 'camera') => {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add photos.`);
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.7 });
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
    Alert.alert('Add photos', 'Show your workshop, equipment or finished work.', [
      { text: 'Take photo', onPress: () => addPhotos('camera') },
      { text: 'Choose from library', onPress: () => addPhotos('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!typeId) e.type = 'Choose the type of service.';
    if (title.trim().length < 3) e.title = 'Give your service a short title.';
    const from = priceFrom.trim() ? Number(priceFrom.replace(/[^0-9.]/g, '')) : null;
    const to = priceTo.trim() ? Number(priceTo.replace(/[^0-9.]/g, '')) : null;
    if (from != null && isNaN(from)) e.priceFrom = 'Enter a number.';
    if (to != null && (isNaN(to) || from == null || to <= from)) e.priceTo = from == null ? 'Add a “from” price first.' : 'Must be more than the “from” price.';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (photos.some((p) => p.uploading)) {
      toast.info('Wait for photos to finish uploading.');
      return;
    }
    setSaving(true);
    const body = {
      typeId,
      title: title.trim(),
      description: description.trim() || null,
      priceFrom: from,
      priceTo: to,
      durationMinutes: duration,
      images: photos.filter((p) => p.url).map((p) => p.url!),
    };
    try {
      if (editing) await apiClient.patch(`/services/${serviceId}`, body);
      else await apiClient.post('/services', body);
      toast.success(editing ? 'Service updated.' : 'Your service is live!');
      navigation.goBack();
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t save the service.'));
    } finally {
      setSaving(false);
    }
  };

  const sendRequest = async () => {
    if (reqName.trim().length < 3) {
      toast.info('Type the name of the service.');
      return;
    }
    setReqSaving(true);
    try {
      await apiClient.post('/service-types/requests', { name: reqName.trim(), note: reqNote.trim() || undefined });
      toast.success('Request sent. We’ll email you when it’s added.');
      setReqOpen(false);
      setReqName('');
      setReqNote('');
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t send the request.'));
    } finally {
      setReqSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title={editing ? 'Edit service' : 'Add a service'} back />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={editing ? 'Edit service' : 'Add a service'} back />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Card title="Type of service" hint="Customers browse services by type.">
          <View style={styles.types}>
            {types.map((t) => {
              const on = t.id === typeId;
              return (
                <TouchableOpacity key={t.id} style={[styles.type, on && styles.typeOn]} onPress={() => setTypeId(t.id)} activeOpacity={0.85}>
                  <Ionicons name={serviceIcon(t.icon)} size={20} color={on ? colors.white : colors.accent} />
                  <Text style={[styles.typeText, on && { color: colors.white }]} numberOfLines={2}>{t.name}</Text>
                  {on ? <Ionicons name="checkmark-circle" size={16} color={colors.white} style={styles.typeCheck} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.type ? <Text style={styles.err}>{errors.type}</Text> : null}
          <TouchableOpacity style={styles.notListed} onPress={() => setReqOpen(true)}>
            <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.notListedText}>My service isn’t listed — ask us to add it</Text>
          </TouchableOpacity>
        </Card>

        <Card title="Photos" hint={`${photos.length}/${MAX_PHOTOS} · optional`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {photos.map((p, i) => (
              <View key={p.key}>
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
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <TouchableOpacity style={styles.addPhoto} onPress={choosePhotoSource}>
                <Ionicons name="camera-outline" size={26} color={colors.accent} />
                <Text style={styles.addPhotoText}>Add photo</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </Card>

        <Card title="Details">
          <TextField label="Title" placeholder="e.g. Full service for Japanese cars" value={title} onChangeText={setTitle} error={errors.title} maxLength={150} />
          <TextField
            label="Description"
            optional
            placeholder="What’s included, brands you work on, warranty on work…"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={4000}
            hint="Don’t add phone numbers or links — customers contact you through AutoGuide chat."
          />
        </Card>

        <Card title="Price" hint="Leave empty for “price on request”.">
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="From" optional prefix="Rs." keyboardType="number-pad" placeholder="3500" value={priceFrom} onChangeText={setPriceFrom} error={errors.priceFrom} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="To" optional prefix="Rs." keyboardType="number-pad" placeholder="25000" value={priceTo} onChangeText={setPriceTo} error={errors.priceTo} />
            </View>
          </View>
          <Text style={styles.label}>How long does it usually take?</Text>
          <View style={styles.chips}>
            {DURATIONS.map(([v, l]) => (
              <TouchableOpacity key={l} style={[styles.chip, duration === v && styles.chipOn]} onPress={() => setDuration(v)}>
                <Text style={[styles.chipText, duration === v && { color: colors.white }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <Button title={editing ? 'Save changes' : 'Publish service'} icon="checkmark" onPress={save} loading={saving} />
      </View>

      <SheetModal
        visible={reqOpen}
        onClose={() => setReqOpen(false)}
        title="Request a service type"
        footer={<Button title="Send request" icon="send" onPress={sendRequest} loading={reqSaving} />}
      >
        <Text style={styles.reqIntro}>Tell us what’s missing. Our team reviews requests and adds new types to the list — we’ll email you when it’s ready.</Text>
        <TextField label="Service name" placeholder="e.g. Wheel alignment" value={reqName} onChangeText={setReqName} maxLength={100} />
        <TextField label="Anything else?" optional placeholder="What the service involves" value={reqNote} onChangeText={setReqNote} multiline maxLength={500} />
      </SheetModal>
    </KeyboardAvoidingView>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{title}</Text>
        {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, ...shadow },
  cardHead: { marginBottom: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardHint: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 11, minHeight: 54 },
  typeOn: { backgroundColor: colors.navy, borderColor: colors.link },
  typeText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  typeCheck: { position: 'absolute', top: 4, right: 4 },
  err: { color: colors.accent, fontSize: 12.5, marginTop: 6 },
  notListed: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingVertical: 4 },
  notListedText: { color: colors.accent, fontWeight: '700', fontSize: 13.5 },
  photo: { width: 92, height: 92, borderRadius: radius.sm, backgroundColor: colors.bg },
  photoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  coverTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: colors.navy, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  coverText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  addPhoto: { width: 92, height: 92, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { color: colors.accent, fontSize: 11.5, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.link },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  reqIntro: { color: colors.textMuted, fontSize: 13.5, lineHeight: 19, marginBottom: spacing.md },
}));
