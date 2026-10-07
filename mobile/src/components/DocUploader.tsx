import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radius, spacing } from '../theme/theme';
import { API_BASE_URL } from '../api/config';
import { getAuthToken } from '../api/authToken';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

export type DocKind = 'BR' | 'NIC_FRONT' | 'NIC_BACK' | 'SELFIE';
export type UploadedDoc = { id: string; kind?: DocKind; fileName: string; mimeType: string; size: number; previewUri?: string };

const MAX_BYTES = 4 * 1024 * 1024;
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

async function upload(uri: string, name: string, type: string, kind: DocKind, extra?: Record<string, string | number>): Promise<UploadedDoc> {
  const form = new FormData();
  form.append('file', { uri, name, type } as any);
  form.append('kind', kind);
  for (const [k, v] of Object.entries(extra ?? {})) form.append(k, String(v));
  const res = await fetch(`${API_BASE_URL}/seller-application/document`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(res.status === 413 ? 'File is too large (max 4 MB).' : data?.message || 'Upload failed.');
  return data as UploadedDoc;
}

interface Props {
  kind: DocKind;
  title: string;
  hint: string;
  value: UploadedDoc | null;
  onChange: (doc: UploadedDoc) => void;
  error?: string;
  allowPdf?: boolean;
  /** Selfie: camera only (front camera), no gallery or files. */
  selfie?: boolean;
  /** Extra form fields captured at upload time (e.g. the selfie's location). */
  getExtra?: () => Promise<Record<string, string | number> | undefined>;
}

// One verification file slot: pick → upload immediately → show a preview.
export function DocUploader({ kind, title, hint, value, onChange, error, allowPdf = true, selfie, getExtra }: Props) {
  const [busy, setBusy] = useState(false);

  const handle = async (uri: string, name: string, type: string, size?: number | null) => {
    if (size && size > MAX_BYTES) {
      Alert.alert('File too large', 'Please choose a file under 4 MB, or take a photo instead.');
      return;
    }
    setBusy(true);
    try {
      const extra = getExtra ? await getExtra() : undefined;
      const doc = await upload(uri, name, type, kind, extra);
      onChange({ ...doc, previewUri: type.startsWith('image/') ? uri : undefined });
    } catch (e) {
      toast.error(errorMessage(e, 'Upload failed.'));
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to continue.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6, cameraType: selfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back });
    if (r.canceled) return;
    const a = r.assets[0];
    return handle(a.uri, a.fileName ?? `${kind.toLowerCase()}.jpg`, a.mimeType ?? 'image/jpeg', a.fileSize);
  };

  const fromPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Allow photo access in Settings to continue.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (r.canceled) return;
    const a = r.assets[0];
    return handle(a.uri, a.fileName ?? `${kind.toLowerCase()}.jpg`, a.mimeType ?? 'image/jpeg', a.fileSize);
  };

  const fromFiles = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
    if (r.canceled) return;
    const a = r.assets[0];
    return handle(a.uri, a.name, a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'), a.size);
  };

  const choose = () => {
    if (selfie) return fromCamera();
    Alert.alert(title, hint, [
      { text: 'Take photo', onPress: fromCamera },
      { text: 'Choose photo', onPress: fromPhotos },
      ...(allowPdf ? [{ text: 'Choose PDF / file', onPress: fromFiles }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{title}</Text>
      {value ? (
        <View style={styles.row}>
          {value.previewUri ? (
            <Image source={{ uri: value.previewUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.icon]}>
              <Ionicons name={value.mimeType === 'application/pdf' ? 'document-attach-outline' : 'image-outline'} size={26} color={colors.navy} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{value.fileName}</Text>
            <Text style={styles.meta}>{value.mimeType === 'application/pdf' ? 'PDF' : 'Photo'} · {kb(value.size)} · uploaded</Text>
          </View>
          <TouchableOpacity onPress={choose} disabled={busy} hitSlop={8}>
            <Text style={styles.replace}>{busy ? '…' : selfie ? 'Retake' : 'Replace'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.box, !!error && { borderColor: colors.accent }]} onPress={choose} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.navy} /> : <Ionicons name={selfie ? 'camera-outline' : 'cloud-upload-outline'} size={26} color={colors.navy} />}
          <Text style={styles.boxTitle}>{busy ? 'Uploading…' : selfie ? 'Take selfie' : 'Upload'}</Text>
          <Text style={styles.boxSub}>{hint}</Text>
        </TouchableOpacity>
      )}
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  box: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.navy, backgroundColor: colors.navySoft, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4 },
  boxTitle: { fontWeight: '800', color: colors.navyDark, fontSize: 15 },
  boxSub: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.bg },
  icon: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navySoft },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.success, fontSize: 12, marginTop: 2, fontWeight: '600' },
  replace: { color: colors.accent, fontWeight: '800' },
  err: { color: colors.accent, fontSize: 12, marginTop: 6 },
});
